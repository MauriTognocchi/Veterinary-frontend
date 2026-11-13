import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { UserResponse } from '../../models/user.model';
import { UserService } from '../../services/user';
import { UserDetail } from './user-detail';
import { AuthService } from '../../../../core/services/auth';

describe('UserDetail', () => {
  let fixture: ComponentFixture<UserDetail>;
  let component: UserDetail;
  let service: { getById: ReturnType<typeof vi.fn> };
  let auth: { hasAnyRole: ReturnType<typeof vi.fn>; email: ReturnType<typeof vi.fn> };

  const user: UserResponse = {
    externalId: 'user-1',
    firstName: 'Ana',
    lastName: 'Pérez',
    email: 'ana@veterinaria.com',
    userState: 'ACTIVE',
  };

  function createComponent(): void {
    fixture = TestBed.createComponent(UserDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    service = { getById: vi.fn() };
    auth = { hasAnyRole: vi.fn().mockReturnValue(true), email: vi.fn().mockReturnValue('ana@veterinaria.com') };

    await TestBed.configureTestingModule({
      imports: [UserDetail],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ externalId: 'user-1' }),
            },
          },
        },
        { provide: UserService, useValue: service },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('consulta el detalle y muestra los datos disponibles', () => {
    const request = new Subject<UserResponse>();
    service.getById.mockReturnValue(request.asObservable());

    createComponent();

    expect(service.getById).toHaveBeenCalledWith('user-1');
    expect(component.loading()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Cargando usuario...');

    request.next(user);
    request.complete();
    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Ana');
    expect(fixture.nativeElement.textContent).toContain('Pérez');
    expect(fixture.nativeElement.textContent).toContain('ana@veterinaria.com');
    expect(fixture.nativeElement.textContent).toContain('ACTIVE');
    expect(fixture.nativeElement.textContent).toContain('Volver al listado');
  });

  it('muestra el estado INACTIVE cuando corresponde', () => {
    service.getById.mockReturnValue(
      of({ ...user, userState: 'INACTIVE' as const }),
    );

    createComponent();

    expect(fixture.nativeElement.textContent).toContain('INACTIVE');
  });

  it('permite abrir un usuario ajeno por URL mostrando únicamente el DTO público', () => {
    auth.hasAnyRole.mockReturnValue(false);
    service.getById.mockReturnValue(of({ externalId: 'user-1', firstName: 'Ana', lastName: 'Pérez' }));
    createComponent();
    expect(service.getById).toHaveBeenCalledWith('user-1');
    expect(fixture.nativeElement.textContent).toContain('Ana');
    expect(fixture.nativeElement.textContent).not.toContain('Email');
    expect(fixture.nativeElement.querySelector('.state-badge')).toBeNull();
  });

  it('conserva el email del perfil propio sin mostrar badge administrativo', () => {
    auth.hasAnyRole.mockReturnValue(false);
    service.getById.mockReturnValue(of(user));
    createComponent();
    expect(fixture.nativeElement.textContent).toContain('ana@veterinaria.com');
    expect(fixture.nativeElement.querySelector('.state-badge')).toBeNull();
  });

  it('reconoce el perfil propio completo sin comparar email', () => {
    auth.hasAnyRole.mockReturnValue(false);
    service.getById.mockReturnValue(of({ ...user, email: undefined }));
    createComponent();
    expect(component.canViewProfile(component.user()!)).toBe(true);
    expect(fixture.nativeElement.querySelector('.state-badge')).toBeNull();
  });

  it('muestra no encontrado cuando el backend responde 404', () => {
    service.getById.mockReturnValue(throwError(() => ({ status: 404 })));

    createComponent();

    expect(component.notFound()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'No encontramos el usuario solicitado.',
    );
  });

  it('muestra el error de carga y permite reintentar', () => {
    service.getById
      .mockReturnValueOnce(throwError(() => ({ status: 500 })))
      .mockReturnValueOnce(of(user));

    createComponent();

    expect(component.loadErrorRetryable()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'No pudimos cargar los datos del usuario. Intentá nuevamente en unos minutos.',
    );

    component.retryLoad();
    fixture.detectChanges();

    expect(service.getById).toHaveBeenCalledTimes(2);
    expect(component.error()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Ana');
  });
});
