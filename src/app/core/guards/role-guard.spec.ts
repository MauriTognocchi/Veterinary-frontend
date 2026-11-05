import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { firstValueFrom, Observable, of } from 'rxjs';
import { AuthService } from '../services/auth';
import { roleGuard } from './role-guard';

describe('roleGuard', () => {
  let authService: {
    ensureSession: ReturnType<typeof vi.fn>;
    hasAnyRole: ReturnType<typeof vi.fn>;
    hasAnyPermission: ReturnType<typeof vi.fn>;
  };
  let router: { createUrlTree: ReturnType<typeof vi.fn> };

  const state = { url: '/owners/new' } as RouterStateSnapshot;

  function executeGuard(
    route: ActivatedRouteSnapshot,
  ): Promise<boolean | UrlTree> {
    const result = TestBed.runInInjectionContext(() => roleGuard(route, state));

    return firstValueFrom(result as Observable<boolean | UrlTree>);
  }

  beforeEach(() => {
    authService = {
      ensureSession: vi.fn(),
      hasAnyRole: vi.fn(),
      hasAnyPermission: vi.fn(),
    };
    router = {
      createUrlTree: vi.fn((commands: unknown[], extras?: unknown) => ({
        commands,
        extras,
      })),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('redirige al login cuando no hay sesión', async () => {
    authService.ensureSession.mockReturnValue(of(false));

    const result = await executeGuard({} as ActivatedRouteSnapshot);

    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/owners/new' },
    });
    expect(result).toEqual({
      commands: ['/login'],
      extras: { queryParams: { returnUrl: '/owners/new' } },
    });
  });

  it('permite el acceso cuando el usuario tiene uno de los roles requeridos', async () => {
    authService.ensureSession.mockReturnValue(of(true));
    authService.hasAnyRole.mockReturnValue(true);

    const route = {
      data: { roles: ['ROLE_ADMIN', 'ROLE_RECEPTIONIST'] },
    } as unknown as ActivatedRouteSnapshot;

    await expect(executeGuard(route)).resolves.toBe(true);
    expect(authService.hasAnyRole).toHaveBeenCalledWith([
      'ROLE_ADMIN',
      'ROLE_RECEPTIONIST',
    ]);
  });

  it('redirige a 403 cuando el usuario no tiene el rol requerido', async () => {
    authService.ensureSession.mockReturnValue(of(true));
    authService.hasAnyRole.mockReturnValue(false);

    const route = {
      data: { roles: ['ROLE_ADMIN', 'ROLE_RECEPTIONIST'] },
    } as unknown as ActivatedRouteSnapshot;

    const result = await executeGuard(route);

    expect(router.createUrlTree).toHaveBeenCalledWith(['/forbidden'], {
      queryParams: { returnUrl: '/owners/new' },
    });
    expect(result).toEqual({
      commands: ['/forbidden'],
      extras: { queryParams: { returnUrl: '/owners/new' } },
    });
  });

  it('permite el acceso cuando el usuario tiene el permiso requerido', async () => {
    authService.ensureSession.mockReturnValue(of(true));
    authService.hasAnyPermission.mockReturnValue(true);

    const route = {
      data: { permissions: ['VIEW_OWNERS'] },
    } as unknown as ActivatedRouteSnapshot;

    await expect(executeGuard(route)).resolves.toBe(true);
    expect(authService.hasAnyPermission).toHaveBeenCalledWith(['VIEW_OWNERS']);
  });

  it('redirige a 403 cuando el usuario no tiene el permiso requerido', async () => {
    authService.ensureSession.mockReturnValue(of(true));
    authService.hasAnyPermission.mockReturnValue(false);

    const route = {
      data: { permissions: ['VIEW_OWNERS'] },
    } as unknown as ActivatedRouteSnapshot;

    const result = await executeGuard(route);

    expect(result).toEqual({
      commands: ['/forbidden'],
      extras: { queryParams: { returnUrl: '/owners/new' } },
    });
  });

  it('permite rutas autenticadas sin metadata de roles o permisos', async () => {
    authService.ensureSession.mockReturnValue(of(true));

    await expect(executeGuard({} as ActivatedRouteSnapshot)).resolves.toBe(
      true,
    );
    expect(authService.hasAnyRole).not.toHaveBeenCalled();
    expect(authService.hasAnyPermission).not.toHaveBeenCalled();
  });
});
