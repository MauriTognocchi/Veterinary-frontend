import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth';
import { TokenStorageService } from '../services/token-storage.service';

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
      if (!is401) {
        return throwError(() => error);
      }

      return authService.refresh().pipe(
        catchError((refreshError: unknown) => {
          if (tokenStorage.getAccessToken() === accessToken) {
            authService.logout('expired');
          }
          return throwError(() => refreshError);
        }),
        switchMap(() => {
          const newToken = tokenStorage.getAccessToken();

          const retryReq = req.clone({
            setHeaders: newToken
              ? { Authorization: `Bearer ${newToken}` }
              : {},
          });

          return next(retryReq).pipe(
            catchError((retryError: unknown) => {
              if (
                retryError instanceof HttpErrorResponse &&
                retryError.status === 401
              ) {
                if (tokenStorage.getAccessToken() === newToken) {
                  authService.logout('expired');
                }
              }
              return throwError(() => retryError);
            }),
          );
        }),
      );
    }),
  );
};
