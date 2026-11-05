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
import { authGuard } from './auth-guard';

describe('authGuard', () => {
  let authService: { ensureSession: ReturnType<typeof vi.fn> };
  let router: { createUrlTree: ReturnType<typeof vi.fn> };

  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/owners' } as RouterStateSnapshot;

  function executeGuard(): Promise<boolean | UrlTree> {
    const result = TestBed.runInInjectionContext(() =>
      authGuard(route, state),
    );

    return firstValueFrom(result as Observable<boolean | UrlTree>);
  }

  beforeEach(() => {
    authService = { ensureSession: vi.fn() };
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

  it('permite el acceso cuando hay sesión', async () => {
    authService.ensureSession.mockReturnValue(of(true));

    await expect(executeGuard()).resolves.toBe(true);
  });

  it('redirige al login con returnUrl cuando no hay sesión', async () => {
    authService.ensureSession.mockReturnValue(of(false));

    const result = await executeGuard();

    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/owners' },
    });
    expect(result).toEqual({
      commands: ['/login'],
      extras: { queryParams: { returnUrl: '/owners' } },
    });
  });
});
