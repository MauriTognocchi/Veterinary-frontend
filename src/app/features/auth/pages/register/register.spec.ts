import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { Register } from './register';

describe('Register', () => {
  let fixture: ComponentFixture<Register>;
  let component: Register;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let authService: { register: ReturnType<typeof vi.fn> };

  function createComponent(): void {
    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function fillForm(): void {
    component.registerForm.setValue({
      firstName: '  Ana  ',
      lastName: '  Pérez  ',
      phone: '  11 5555-1234  ',
      email: 'ana@example.com',
      dni: '  30123456  ',
      address: {
        street: '  Av. Siempre Viva  ',
        number: '  742  ',
        city: '  Springfield  ',
        province: '  Buenos Aires  ',
        country: '  Argentina  ',
      },
      password: 'secreto',
      confirmPassword: 'secreto',
    });
  }

  beforeEach(async () => {
    router = { navigate: vi.fn().mockResolvedValue(true) };
    authService = { register: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => null },
              queryParamMap: { get: () => null },
            },
          },
        },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();
  });

  it('valida los campos obligatorios sin llamar al servicio', () => {
    createComponent();

    component.onSubmit();

    expect(component.registerForm.invalid).toBe(true);
    expect(authService.register).not.toHaveBeenCalled();
    expect(component.registerForm.get('firstName')?.touched).toBe(true);
    expect(component.addressGroup.get('street')?.touched).toBe(true);
  });

  it('rechaza contraseñas que no coinciden', () => {
    createComponent();
    fillForm();
    component.registerForm.get('confirmPassword')?.setValue('otra');

    expect(component.registerForm.hasError('passwordsMismatch')).toBe(true);

    component.onSubmit();

    expect(authService.register).not.toHaveBeenCalled();
  });

  it('envía los datos recortados y navega al login', () => {
    authService.register.mockReturnValue(of('User registered successfully'));
    createComponent();
    fillForm();

    component.onSubmit();

    expect(authService.register).toHaveBeenCalledWith({
      firstName: 'Ana',
      lastName: 'Pérez',
      phone: '11 5555-1234',
      email: 'ana@example.com',
      dni: '30123456',
      address: {
        street: 'Av. Siempre Viva',
        number: '742',
        city: 'Springfield',
        province: 'Buenos Aires',
        country: 'Argentina',
      },
      password: 'secreto',
    });
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { registered: '1' },
    });
    expect(component.saving()).toBe(false);
  });

  it('muestra el error cuando ya existe la cuenta', () => {
    authService.register.mockReturnValue(throwError(() => ({ status: 409 })));
    createComponent();
    fillForm();

    component.onSubmit();

    expect(component.error()).toBe(
      'Ya existe una cuenta registrada con ese email o DNI.',
    );
    expect(component.registerForm.enabled).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
