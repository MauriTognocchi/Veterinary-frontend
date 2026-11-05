import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { UserPermission, UserRole } from '../models/auth.model';
import { AuthService } from '../services/auth';

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

      const requiredRoles =
        (route.data?.['roles'] as readonly UserRole[] | undefined) ?? [];
      const requiredPermissions =
        (route.data?.['permissions'] as readonly UserPermission[] | undefined) ??
        [];

      if (requiredRoles.length === 0 && requiredPermissions.length === 0) {
        return true;
      }

      const hasRequiredRole =
        requiredRoles.length === 0 || authService.hasAnyRole(requiredRoles);
      const hasRequiredPermission =
        requiredPermissions.length === 0 ||
        authService.hasAnyPermission(requiredPermissions);

      if (hasRequiredRole && hasRequiredPermission) {
        return true;
      }

      return router.createUrlTree(['/forbidden'], {
        queryParams: { returnUrl: state.url },
      });
    }),
  );
};
