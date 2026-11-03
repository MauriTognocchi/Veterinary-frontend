import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize, Observable, shareReplay, tap, throwError } from 'rxjs';
import { LoginRequest, LoginResponse, RefreshResponse } from '../models/auth.model';
import { TokenStorageService } from './token-storage.service';
import { Router } from '@angular/router';

export type LogoutReason = 'manual' | 'expired' | 'timeout';

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

  private refreshRequest$: Observable<RefreshResponse> | null = null;
  private sessionGeneration = 0;

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

  logout(reason: LogoutReason = 'manual'): void {
    const hadSession =
      this._isAuthenticated() ||
      this.tokenStorage.getAccessToken() !== null ||
      this.tokenStorage.getRefreshToken() !== null;

    this.sessionGeneration++;
    this.refreshRequest$ = null;

    this.tokenStorage.clearTokens();
    this._isAuthenticated.set(false);

   
    if (!hadSession) {
      return;
    }

    this.router.navigate(['/login'], {
      queryParams: reason === 'manual' ? {} : { reason },
    });
  }
}