import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  catchError,
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
  USER_ROLES,
  UserPermission,
  UserRole,
} from '../models/auth.model';
import { TokenStorageService } from './token-storage.service';
import { Router } from '@angular/router';

export type LogoutReason = 'manual' | 'expired' | 'timeout';

interface AccessTokenClaims {
  roles: UserRole[];
  permissions: UserPermission[];
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');

  if (parts.length < 2) {
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

    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

function extractClaims(token: string | null): AccessTokenClaims {
  if (!token) {
    return { roles: [], permissions: [] };
  }

  const payload = decodeJwtPayload(token);

  if (!payload) {
    return { roles: [], permissions: [] };
  }

  const rawRoles = payload['roles'];
  const authorities = Array.isArray(rawRoles)
    ? rawRoles.filter((value): value is string => typeof value === 'string')
    : typeof rawRoles === 'string'
      ? [rawRoles]
      : [];

  return {
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

  private readonly _isAuthenticated = signal(
    this.tokenStorage.getAccessToken() !== null ||
      this.tokenStorage.getRefreshToken() !== null,
  );

  readonly isAuthenticated = this._isAuthenticated.asReadonly();

  private readonly _roles = signal<readonly UserRole[]>([]);
  private readonly _permissions = signal<readonly UserPermission[]>([]);

  readonly roles = this._roles.asReadonly();
  readonly permissions = this._permissions.asReadonly();

  private refreshRequest$: Observable<RefreshResponse> | null = null;
  private sessionGeneration = 0;

  constructor() {
    this.applyAccessToken(this.tokenStorage.getAccessToken());
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
    if (!this._isAuthenticated()) {
      return of(false);
    }

    if (this.hasDecodableAccessToken()) {
      return of(true);
    }

    return this.refresh().pipe(
      map(() => {
        const authenticated =
          this._isAuthenticated() && this.hasDecodableAccessToken();

        if (!authenticated) {
          this.clearSession();
        }

        return authenticated;
      }),
      catchError(() => {
        this.clearSession();
        return of(false);
      }),
    );
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/api/auth/login`, credentials)
      .pipe(
        tap((response) => {
          if (!response?.accessToken || !response?.refreshToken) {
            throw new Error('Respuesta de login inválida');
          }

          this.sessionGeneration++;
          this.refreshRequest$ = null;
          this.tokenStorage.setTokens(
            response.accessToken,
            response.refreshToken,
          );
          this.applyAccessToken(response.accessToken);
          this._isAuthenticated.set(true);
        }),
      );
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

          if (!response?.accessToken) {
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

    this._roles.set(claims.roles);
    this._permissions.set(claims.permissions);
  }
}
