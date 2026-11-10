import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { BranchService } from '../../../branches/services/branch';
import { VeterinarianResponse } from '../../models/veterinarian.model';
import { VeterinarianService } from '../../services/veterinarian';
import { VeterinarianList } from './veterinarian-list';

describe('VeterinarianList', () => {
  let fixture: ComponentFixture<VeterinarianList>;
  let component: VeterinarianList;
  let vetService: { getAll: ReturnType<typeof vi.fn> };
  let branchService: { getAll: ReturnType<typeof vi.fn> };

  const veterinarian: VeterinarianResponse = {
    externalId: 'vet-1',
    firstName: 'Juan',
    lastName: 'Pérez',
    licenseNumber: 'MN-1234',
    phone: '11 5555-6789',
    email: 'jperez@veterinaria.com',
    workStartTime: '08:00:00',
    workEndTime: '16:00:00',
    workDays: ['MONDAY', 'WEDNESDAY'],
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
    fixture = TestBed.createComponent(VeterinarianList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    vetService = { getAll: vi.fn() };
    branchService = { getAll: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [VeterinarianList],
      providers: [
        {
          provide: Router,
          useValue: { navigate: vi.fn().mockResolvedValue(true) },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => null } } },
        },
        { provide: VeterinarianService, useValue: vetService },
        { provide: BranchService, useValue: branchService },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('carga los veterinarios y las sucursales al iniciar', () => {
    vetService.getAll.mockReturnValue(of([veterinarian]));
    branchService.getAll.mockReturnValue(of([]));

    createComponent();

    expect(vetService.getAll).toHaveBeenCalledWith({
      firstName: '',
      lastName: '',
      licenseNumber: '',
      branchExternalId: '',
    });
    expect(component.veterinarians()).toEqual([veterinarian]);
    expect(component.loading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Juan');
    expect(fixture.nativeElement.textContent).toContain('MN-1234');
    expect(fixture.nativeElement.textContent).toContain('Sucursal Centro');
  });

  it('aplica los filtros al buscar', () => {
    vetService.getAll.mockReturnValue(of([]));
    branchService.getAll.mockReturnValue(of([]));

    createComponent();

    component.filtersForm.setValue({
      firstName: ' Juan ',
      lastName: 'Pérez',
      licenseNumber: 'MN-1234',
      branchExternalId: 'branch-1',
    });
    component.loadVeterinarians();
    fixture.detectChanges();

    expect(vetService.getAll).toHaveBeenLastCalledWith({
      firstName: ' Juan ',
      lastName: 'Pérez',
      licenseNumber: 'MN-1234',
      branchExternalId: 'branch-1',
    });
    expect(component.appliedFilters()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'No encontramos veterinarios con los filtros aplicados.',
    );
  });

  it('limpia los filtros y vuelve a consultar', () => {
    vetService.getAll.mockReturnValue(of([]));
    branchService.getAll.mockReturnValue(of([]));

    createComponent();

    component.filtersForm.setValue({
      firstName: 'Juan',
      lastName: 'Pérez',
      licenseNumber: 'MN-1',
      branchExternalId: 'branch-1',
    });
    component.clearFilters();
    fixture.detectChanges();

    expect(component.filtersForm.getRawValue()).toEqual({
      firstName: '',
      lastName: '',
      licenseNumber: '',
      branchExternalId: '',
    });
    expect(vetService.getAll).toHaveBeenLastCalledWith({
      firstName: '',
      lastName: '',
      licenseNumber: '',
      branchExternalId: '',
    });
    expect(component.appliedFilters()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain(
      'No hay veterinarios registrados.',
    );
  });

  it('identifica visualmente a los veterinarios inactivos', () => {
    vetService.getAll.mockReturnValue(
      of([{ ...veterinarian, active: false }]),
    );
    branchService.getAll.mockReturnValue(of([]));

    createComponent();

    expect(fixture.nativeElement.textContent).toContain('Inactivo');
    const badge = fixture.nativeElement.querySelector('.status-badge.is-inactive');
    expect(badge).not.toBeNull();
    const row = fixture.nativeElement.querySelector('tbody tr.is-inactive');
    expect(row).not.toBeNull();
  });

  it('muestra el error de permisos', () => {
    vetService.getAll.mockReturnValue(throwError(() => ({ status: 403 })));
    branchService.getAll.mockReturnValue(of([]));

    createComponent();

    expect(component.error()).toBe(
      'No tenés permisos para ver los veterinarios.',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'No tenés permisos para ver los veterinarios.',
    );
  });

  it('muestra el error reintentable de carga', () => {
    vetService.getAll.mockReturnValue(throwError(() => ({ status: 0 })));
    branchService.getAll.mockReturnValue(of([]));

    createComponent();

    expect(component.loadErrorRetryable()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Reintentar');
  });

  it('no bloquea el listado si falla la carga de sucursales', () => {
    vetService.getAll.mockReturnValue(of([veterinarian]));
    branchService.getAll.mockReturnValue(throwError(() => ({ status: 500 })));

    createComponent();

    expect(component.branchesLoadError()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'No pudimos cargar las sucursales para el filtro.',
    );
    expect(component.veterinarians()).toEqual([veterinarian]);
  });
});
