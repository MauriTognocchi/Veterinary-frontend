import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenStorageService } from '../services/token-storage.service';

export const authGuard: CanActivateFn = (route, state) => {
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);

  const token = tokenStorage.getAccessToken();
  console.log('[AUTH GUARD] ¿Hay token?:', !!token);
  console.log('[AUTH GUARD] URL a la que intenta entrar:', state.url);
  
  ///reviso si esta el token para poder acceder a lo que se necesita tener en una sesion iniciada
  if(tokenStorage.getAccessToken()){
    return true;
  }

  ///si no esta el token lo manda al login. Pero guarda la url primero para volver a llevarlo ahi luego de hacer el login
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url},
  })
};
