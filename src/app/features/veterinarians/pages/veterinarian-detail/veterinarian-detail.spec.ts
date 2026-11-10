import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { VeterinarianResponse } from '../../models/veterinarian.model';
import { VeterinarianService } from '../../services/veterinarian';
import { VeterinarianDetail } from './veterinarian-detail';

describe('VeterinarianDetail', () => {
  let fixture: ComponentFixture<VeterinarianDetail>;
  let component: VeterinarianDetail;
  let service: { getById: ReturnType<typeof vi.fn> };

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
    service = { getById: vi.fn() };

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
        { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
        { provide: ActivatedRoute, useValue: route },
        { provide: VeterinarianService, useValue: service },
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
});
