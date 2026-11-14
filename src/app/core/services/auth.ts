import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  catchError,
  defer,
  finalize,
  map,
  Observable,
  of,
  shareReplay,
  tap,
  throwError,
} from 'rxjs';
import {
  LoginRequest,
  LoginResponse,
  RefreshResponse,
  RegisterRequest,
  USER_ROLES,
  UserPermission,
  UserRole,
} from '../models/auth.model';
import { TokenStorageService } from './token-storage.service';
import { Router } from '@angular/router';

export type LogoutReason = 'manual' | 'expired' | 'timeout';

interface AccessTokenClaims {
  email: string | null;
  roles: UserRole[];
  permissions: UserPermission[];
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');

  if (parts.length !== 3 || !parts[2]) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const binary = atob(padded);
    const json = decodeURIComponent(
      Array.from(binary)
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );

    const payload: unknown = JSON.parse(json);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }
    const claims = payload as Record<string, unknown>;
    if (
      typeof claims['sub'] !== 'string' ||
      !claims['sub'].trim() ||
      typeof claims['exp'] !== 'number' ||
      claims['exp'] * 1000 <= Date.now() ||
      !Array.isArray(claims['roles'])
    ) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

function extractClaims(token: string | null): AccessTokenClaims {
  if (!token) {
    return { email: null, roles: [], permissions: [] };
  }

  const payload = decodeJwtPayload(token);

  if (!payload) {
    return { email: null, roles: [], permissions: [] };
  }

  const rawSubject = payload['sub'];
  const email =
    typeof rawSubject === 'string' && rawSubject.trim()
      ? rawSubject.trim()
      : null;

  const rawRoles = payload['roles'];
  const authorities = Array.isArray(rawRoles)
    ? rawRoles.filter((value): value is string => typeof value === 'string')
    : typeof rawRoles === 'string'
      ? [rawRoles]
      : [];

  return {
    email,
    roles: authorities.filter(isUserRole),
    permissions: authorities.filter((value) => !value.startsWith('ROLE_')),
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  // URL base temporal - debe confirmarse con la configuración real del backend
  private readonly baseUrl = 'http://localhost:8080';
  private http = inject(HttpClient);
  private tokenStorage = inject(TokenStorageService);
  private router = inject (Router);

  private readonly _isAuthenticated = signal(this.hasDecodableAccessToken());

  readonly isAuthenticated = this._isAuthenticated.asReadonly();

  private readonly _email = signal<string | null>(null);
  private readonly _roles = signal<readonly UserRole[]>([]);
  private readonly _permissions = signal<readonly UserPermission[]>([]);

  readonly email = this._email.asReadonly();
  readonly roles = this._roles.asReadonly();
  readonly permissions = this._permissions.asReadonly();

  private refreshRequest$: Observable<RefreshResponse> | null = null;
  private sessionGeneration = 0;
  private readonly _sessionVersion = signal(0);
  readonly sessionVersion = this._sessionVersion.asReadonly();

  constructor() {
    this.applyAccessToken(
      this.hasDecodableAccessToken() ? this.tokenStorage.getAccessToken() : null,
    );
  }

  hasRole(role: UserRole): boolean {
    return this._roles().includes(role);
  }

  hasAnyRole(roles: readonly UserRole[]): boolean {
    return roles.some((role) => this._roles().includes(role));
  }

  hasPermission(permission: UserPermission): boolean {
    return this._permissions().includes(permission);
  }

  hasAnyPermission(permissions: readonly UserPermission[]): boolean {
    return permissions.some((permission) =>
      this._permissions().includes(permission),
    );
  }

  hasDecodableAccessToken(): boolean {
    const accessToken = this.tokenStorage.getAccessToken();
    return accessToken !== null && decodeJwtPayload(accessToken) !== null;
  }

  /**
   * Garantiza un access token decodificable antes de evaluar roles.
   * Si falta o es inválido, reutiliza el refresh token existente.
   */
  ensureSession(): Observable<boolean> {
    if (this.hasDecodableAccessToken()) {
      if (!this._isAuthenticated()) {
        this.applyAccessToken(this.tokenStorage.getAccessToken());
        this._isAuthenticated.set(true);
      }
      return of(true);
    }

    if (!this.tokenStorage.getRefreshToken()) {
      this.clearSession();
      return of(false);
    }

    const generation = this.sessionGeneration;
    return this.refresh().pipe(
      map(() => {
        const authenticated =
          this._isAuthenticated() && this.hasDecodableAccessToken();

        if (!authenticated && generation === this.sessionGeneration) {
          this.clearSession();
        }

        return authenticated;
      }),
      catchError(() => {
        if (generation === this.sessionGeneration) {
          this.clearSession();
        }
        return of(this._isAuthenticated() && this.hasDecodableAccessToken());
      }),
    );
  }

  register(request: RegisterRequest): Observable<string> {
    return this.http.post(`${this.baseUrl}/api/auth/register`, request, {
      responseType: 'text',
    });
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return defer(() => {
      // El formulario de login no debe heredar una sesión anterior, aunque falle el intento.
      this.clearSession();
      const generation = this.sessionGeneration;
      return this.http.post<LoginResponse>(`${this.baseUrl}/api/auth/login`, credentials).pipe(
        tap((response) => {
          if (
            !response?.accessToken ||
            !response?.refreshToken ||
            decodeJwtPayload(response.accessToken) === null
          ) {
            throw new Error('Respuesta de login inválida');
          }

          this.sessionGeneration++;
          this._sessionVersion.update((version) => version + 1);
          this.refreshRequest$ = null;
          this.tokenStorage.setTokens(
            response.accessToken,
            response.refreshToken,
          );
          this.applyAccessToken(response.accessToken);
          this._isAuthenticated.set(true);
        }),
        catchError((error: unknown) => {
          if (generation === this.sessionGeneration) {
            this.clearSession();
          }
          return throwError(() => error);
        }),
      );
    });
  }

  /**
   * Single-flight: si llegan varios 401 al mismo tiempo,
   * todos comparten la misma petición de refresh.
   */
  refresh(): Observable<RefreshResponse> {
    if (this.refreshRequest$) {
      return this.refreshRequest$;
    }

    const refreshToken = this.tokenStorage.getRefreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('No hay refresh token'));
    }

    const generation = this.sessionGeneration;

    let request$: Observable<RefreshResponse>;

    request$ = this.http
      .post<RefreshResponse>(
        `${this.baseUrl}/api/auth/refresh`,
        { refreshToken },
      )
      .pipe(
        tap((response) => {
          if (generation !== this.sessionGeneration) {
            return;
          }

          if (
            !response?.accessToken ||
            decodeJwtPayload(response.accessToken) === null
          ) {
            throw new Error('Refresh sin accessToken');
          }

          this.tokenStorage.setTokens(
            response.accessToken,
            response.refreshToken ?? refreshToken,
          );

          this.applyAccessToken(response.accessToken);
          this._isAuthenticated.set(true);
        }),
        finalize(() => {
          if (this.refreshRequest$ === request$) {
            this.refreshRequest$ = null;
          }
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    this.refreshRequest$ = request$;

    return request$;
  }

  clearSession(): void {
    this.sessionGeneration++;
    this._sessionVersion.update((version) => version + 1);
    this.refreshRequest$ = null;

    this.tokenStorage.clearTokens();
    this._isAuthenticated.set(false);
    this.applyAccessToken(null);
  }

  logout(reason: LogoutReason = 'manual'): void {
    const hadSession =
      this._isAuthenticated() ||
      this.tokenStorage.getAccessToken() !== null ||
      this.tokenStorage.getRefreshToken() !== null;

    this.clearSession();

    if (!hadSession) {
      return;
    }

    this.router.navigate(['/login'], {
      queryParams: reason === 'manual' ? {} : { reason },
    });
  }

  private applyAccessToken(accessToken: string | null): void {
    const claims = extractClaims(accessToken);

    this._email.set(claims.email);
    this._roles.set(claims.roles);
    this._permissions.set(claims.permissions);
  }
}
