import { Data, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { UserPermission, UserRole } from '../models/auth.model';

/** Same role/permission rule used by roleGuard; both requirements must hold. */
export function hasRequiredRouteAccess(auth: AuthService, data: Data | undefined): boolean {
  const roles = (data?.['roles'] as readonly UserRole[] | undefined) ?? [];
  const permissions = (data?.['permissions'] as readonly UserPermission[] | undefined) ?? [];
  const hasRole = roles.length === 0 || auth.hasAnyRole(roles);
  const hasPermission = permissions.length === 0 || auth.hasAnyPermission(permissions);
  return hasRole && hasPermission;
}

/** Checks a configured route path (including route patterns) for navigation UI, never authorization. */
export function canNavigateTo(auth: AuthService, router: Router, path: string): boolean {
  if (!auth.isAuthenticated()) return false;
  const route = router.config.find((item) => item.path === path.replace(/^\//, ''));
  return !!route?.canActivate?.length && !!route.data &&
    ('roles' in route.data || 'permissions' in route.data) &&
    hasRequiredRouteAccess(auth, route.data);
}
