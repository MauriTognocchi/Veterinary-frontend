import {
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth';
import { TokenStorageService } from '../services/token-storage.service';

/**
 * Marca la petición que ya fue reintentada después de un refresh.
 * Evita loops infinitos si el reintento también devuelve 401.
 */
const RETRIED_AFTER_REFRESH = new HttpContextToken<boolean>(() => false);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const authService = inject(AuthService);

  // Cubre login, refresh y cualquier endpoint de auth.
  // A estos NO se les agrega Authorization.
  const isAuthRequest = req.url.includes('/api/auth/');

  if (isAuthRequest) {
    return next(req);
  }

  const accessToken = tokenStorage.getAccessToken();

  const requestWithToken = accessToken
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    : req;

  return next(requestWithToken).pipe(
    catchError((error: unknown) => {
      const is401 = error instanceof HttpErrorResponse && error.status === 401;
      const alreadyRetried = req.context.get(RETRIED_AFTER_REFRESH);

      // Si no es 401, o ya reintentamos esta petición, no hacemos nada.
      if (!is401 || alreadyRetried) {
        return throwError(() => error);
      }

      return authService.refresh().pipe(
        switchMap(() => {
          const newToken = tokenStorage.getAccessToken();

          const retryReq = req.clone({
            context: req.context.set(RETRIED_AFTER_REFRESH, true),
            setHeaders: newToken
              ? { Authorization: `Bearer ${newToken}` }
              : {},
          });

          return next(retryReq);
        }),
        catchError((refreshError: unknown) => {
          // Solo cerramos sesión si el backend rechazó el refresh token
          // (401/403) o si ya no hay refresh token guardado. Un 5xx o un
          // error de red es transitorio y no invalida la sesión.
          const refreshRejected =
            refreshError instanceof HttpErrorResponse &&
            (refreshError.status === 401 || refreshError.status === 403);

          const hasRefreshToken = tokenStorage.getRefreshToken() !== null;

          if (refreshRejected || !hasRefreshToken) {
            authService.logout('expired');
          }

          return throwError(() => refreshError);
        }),
      );
    }),
  );
};