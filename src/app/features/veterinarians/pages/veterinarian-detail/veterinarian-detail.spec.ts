import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { VeterinarianResponse } from '../../models/veterinarian.model';
import { VeterinarianService } from '../../services/veterinarian';
import { VeterinarianDetail } from './veterinarian-detail';

describe('VeterinarianDetail', () => {
  let fixture: ComponentFixture<VeterinarianDetail>;
  let component: VeterinarianDetail;
  let service: {
    getById: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let authService: { hasAnyRole: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  const veterinarian: VeterinarianResponse = {
    externalId: 'vet-1',
    firstName: 'Juan',
    lastName: 'Pérez',
    licenseNumber: 'MN-1234',
    phone: '11 5555-6789',
    email: 'jperez@veterinaria.com',
    workStartTime: '08:00:00',
    workEndTime: '16:00:00',
    workDays: ['FRIDAY', 'MONDAY', 'WEDNESDAY'],
    active: true,
    branch: {
      externalId: 'branch-1',
      name: 'Sucursal Centro',
      phone: '11 5555-1234',
      email: 'centro@veterinaria.com',
      openingTime: '08:00:00',
      closingTime: '18:00:00',
      address: null,
    },
  };

  function createComponent(): void {
    fixture = TestBed.createComponent(VeterinarianDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    service = { getById: vi.fn(), delete: vi.fn() };
    authService = { hasAnyRole: vi.fn().mockReturnValue(false) };
    router = { navigate: vi.fn().mockResolvedValue(true) };

    const route = {
      snapshot: {
        paramMap: {
          get: (key: string) => (key === 'externalId' ? 'vet-1' : null),
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [VeterinarianDetail],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        { provide: VeterinarianService, useValue: service },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('carga y muestra los datos del veterinario', () => {
    service.getById.mockReturnValue(of(veterinarian));

    createComponent();

    expect(component.veterinarian()).toEqual(veterinarian);
    expect(fixture.nativeElement.textContent).toContain('Juan');
    expect(fixture.nativeElement.textContent).toContain('Pérez');
    expect(fixture.nativeElement.textContent).toContain('MN-1234');
    expect(fixture.nativeElement.textContent).toContain('jperez@veterinaria.com');
    expect(fixture.nativeElement.textContent).toContain('08:00 - 16:00');
    expect(fixture.nativeElement.textContent).toContain('Sucursal Centro');
    expect(fixture.nativeElement.textContent).toContain('Activo');
  });

  it('ordena y traduce los días de trabajo', () => {
    service.getById.mockReturnValue(of(veterinarian));

    createComponent();

    expect(component.formatWorkDays(veterinarian.workDays)).toBe(
      'Lunes, Miércoles, Viernes',
    );
    expect(component.formatWorkDays(null)).toBe('—');
    expect(component.formatWorkDays([])).toBe('—');
  });

  it('muestra el estado de veterinario sin sucursal', () => {
    service.getById.mockReturnValue(
      of({ ...veterinarian, branch: null, active: false }),
    );

    createComponent();

    expect(fixture.nativeElement.textContent).toContain('Sin sucursal asignada');
    expect(fixture.nativeElement.textContent).toContain('Inactivo');
  });

  it('muestra el estado no encontrado', () => {
    service.getById.mockReturnValue(throwError(() => ({ status: 404 })));

    createComponent();

    expect(component.notFound()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'No encontramos el veterinario solicitado.',
    );
  });

  it('muestra el error de permisos', () => {
    service.getById.mockReturnValue(throwError(() => ({ status: 403 })));

    createComponent();

    expect(component.error()).toBe(
      'No tenés permisos para ver este veterinario.',
    );
  });

  it('reintenta la carga cuando el error es reintentable', () => {
    service.getById
      .mockReturnValueOnce(throwError(() => ({ status: 0 })))
      .mockReturnValueOnce(of(veterinarian));

    createComponent();

    expect(component.loadErrorRetryable()).toBe(true);

    component.retryLoad();

    expect(service.getById).toHaveBeenCalledTimes(2);
    expect(component.veterinarian()).toEqual(veterinarian);
  });

  it('muestra las acciones administrativas solo para ADMIN', () => {
    service.getById.mockReturnValue(of(veterinarian));
    authService.hasAnyRole.mockReturnValue(true);

    createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Editar');
    expect(text).toContain('Eliminar');
  });

  it('oculta las acciones administrativas para otros roles', () => {
    service.getById.mockReturnValue(of(veterinarian));

    createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('Editar');
    expect(text).not.toContain('Eliminar');
    expect(text).toContain('Volver al listado');
  });

  it('no ofrece eliminar a un veterinario ya inactivo', () => {
    service.getById.mockReturnValue(
      of({ ...veterinarian, active: false }),
    );
    authService.hasAnyRole.mockReturnValue(true);

    createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Editar');
    expect(text).not.toContain('Eliminar');
  });

  it('pide confirmación y vuelve al listado tras dar de baja', () => {
    service.getById.mockReturnValue(of(veterinarian));
    service.delete.mockReturnValue(of(undefined));
    authService.hasAnyRole.mockReturnValue(true);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    createComponent();

    component.deleteVeterinarian();

    expect(confirmSpy).toHaveBeenCalled();
    expect(service.delete).toHaveBeenCalledWith('vet-1');
    expect(router.navigate).toHaveBeenCalledWith(['/veterinarians']);
    expect(component.deleting()).toBe(false);
  });

  it('no elimina si se cancela la confirmación', () => {
    service.getById.mockReturnValue(of(veterinarian));
    authService.hasAnyRole.mockReturnValue(true);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    createComponent();

    component.deleteVeterinarian();

    expect(service.delete).not.toHaveBeenCalled();
  });

  it('muestra el error cuando el veterinario ya está inactivo', () => {
    service.getById.mockReturnValue(of(veterinarian));
    service.delete.mockReturnValue(throwError(() => ({ status: 409 })));
    authService.hasAnyRole.mockReturnValue(true);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    createComponent();

    component.deleteVeterinarian();
    fixture.detectChanges();

    expect(component.deleteError()).toBe('El veterinario ya está inactivo.');
    expect(fixture.nativeElement.textContent).toContain(
      'El veterinario ya está inactivo.',
    );
    expect(component.deleting()).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
