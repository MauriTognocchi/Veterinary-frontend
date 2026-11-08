import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { Login } from './login';

const ERROR_CASES = [
  { status: 401, message: 'Credenciales incorrectas.' },
  { status: 403, message: 'No tenés permisos para acceder.' },
  {
    status: 0,
    message:
      'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
  },
  {
    status: 500,
    message:
      'No pudimos iniciar sesión. Intentá nuevamente en unos minutos.',
  },
  {
    status: 408,
    message:
      'No pudimos iniciar sesión. Intentá nuevamente en unos minutos.',
  },
  {
    status: 429,
    message:
      'No pudimos iniciar sesión. Intentá nuevamente en unos minutos.',
  },
  {
    status: undefined,
    message: 'No pudimos iniciar sesión. Intentá nuevamente.',
  },
];

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let component: Login;
  let router: {
    navigate: ReturnType<typeof vi.fn>;
    navigateByUrl: ReturnType<typeof vi.fn>;
  };
  let authService: { login: ReturnType<typeof vi.fn> };
  let queryParams: Record<string, string | null>;

  function createComponent(): void {
    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function submitValidLogin(): void {
    component.loginForm.setValue({
      username: 'admin',
      password: 'secreto',
    });
    component.onSubmit();
  }

  beforeEach(async () => {
    queryParams = {};
    router = {
      navigate: vi.fn().mockResolvedValue(true),
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };
    authService = { login: vi.fn() };

    const route = {
      snapshot: {
        queryParamMap: {
          get: (key: string) => queryParams[key] ?? null,
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();
  });

  it.each(ERROR_CASES)(
    'muestra el mensaje correspondiente al error $status',
    ({ status, message }) => {
      createComponent();
      authService.login.mockReturnValue(throwError(() => ({ status })));

      submitValidLogin();

      expect(component.error()).toBe(message);
      expect(component.loading()).toBe(false);
      expect(component.loginForm.enabled).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    },
  );

  it('navega al returnUrl seguro después de un login exitoso', () => {
    queryParams['returnUrl'] = '/owners/42';
    createComponent();
    authService.login.mockReturnValue(
      of({ accessToken: 'access-token', refreshToken: 'refresh-token' }),
    );

    submitValidLogin();

    expect(authService.login).toHaveBeenCalledWith({
      username: 'admin',
      password: 'secreto',
    });
    expect(component.loading()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/owners/42');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'sin returnUrl', returnUrl: null },
    {
      label: 'con un returnUrl no seguro',
      returnUrl: 'https://evil.example',
    },
  ])('navega al inicio $label', ({ returnUrl }) => {
    if (returnUrl !== null) {
      queryParams['returnUrl'] = returnUrl;
    }

    createComponent();
    authService.login.mockReturnValue(
      of({ accessToken: 'access-token', refreshToken: 'refresh-token' }),
    );

    submitValidLogin();

    expect(component.loading()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it.each([
    {
      reason: 'timeout',
      message: 'Tu sesión se cerró por inactividad.',
    },
    {
      reason: 'expired',
      message: 'Tu sesión expiró. Iniciá sesión nuevamente.',
    },
  ])('muestra el mensaje para reason=$reason', ({ reason, message }) => {
    queryParams['reason'] = reason;
    createComponent();

    const alert = fixture.nativeElement.querySelector(
      '.alert-info',
    ) as HTMLElement | null;

    expect(component.logoutReason).toBe(reason);
    expect(alert?.textContent).toContain(message);
  });

  it('muestra el mensaje de cuenta creada al volver del registro', () => {
    queryParams['registered'] = '1';
    createComponent();

    const alert = fixture.nativeElement.querySelector(
      '.alert-success',
    ) as HTMLElement | null;

    expect(component.registered).toBe(true);
    expect(alert?.textContent).toContain(
      'Tu cuenta se creó correctamente. Iniciá sesión para continuar.',
    );
  });
});
