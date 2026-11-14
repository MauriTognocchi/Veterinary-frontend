import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth';
import { hasRequiredRouteAccess } from './route-access';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.ensureSession().pipe(
    map((authenticated) => {
      if (!authenticated) {
        return router.createUrlTree(['/login'], {
          queryParams: { returnUrl: state.url },
        });
      }

      if (hasRequiredRouteAccess(authService, route.data)) {
        return true;
      }

      return router.createUrlTree(['/forbidden'], {
        queryParams: { returnUrl: state.url },
      });
    }),
  );
};
