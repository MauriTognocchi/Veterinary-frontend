import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenStorageService } from '../services/token-storage.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const accessToken = tokenStorage.getAccessToken();

  if (req.headers.has('Authorization')) {
    return next(req);
  }

  const loginUrl = 'http://localhost:8080/api/auth/login';
  const refreshUrl = 'http://localhost:8080/api/auth/refresh';

  const isAuthRequest = req.url === loginUrl || req.url === refreshUrl;

  if (!accessToken || isAuthRequest) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return next(authReq);
};
