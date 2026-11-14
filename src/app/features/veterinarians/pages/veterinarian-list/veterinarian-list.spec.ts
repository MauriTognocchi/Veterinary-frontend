import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { BranchService } from '../../../branches/services/branch';
import { VeterinarianResponse } from '../../models/veterinarian.model';
import { VeterinarianService } from '../../services/veterinarian';
import { VeterinarianList } from './veterinarian-list';

describe('VeterinarianList', () => {
  let fixture: ComponentFixture<VeterinarianList>;
  let component: VeterinarianList;
  let vetService: {
    getAll: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    reactivate: ReturnType<typeof vi.fn>;
  };
  let branchService: { getAll: ReturnType<typeof vi.fn> };
  let authService: { hasAnyRole: ReturnType<typeof vi.fn>; hasAnyPermission: ReturnType<typeof vi.fn> };

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
    vetService = { getAll: vi.fn(), delete: vi.fn(), reactivate: vi.fn() };
    branchService = { getAll: vi.fn() };
    authService = { hasAnyRole: vi.fn().mockReturnValue(false), hasAnyPermission: vi.fn().mockReturnValue(false) };

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
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('carga los veterinarios y las sucursales al iniciar', () => {
    authService.hasAnyRole.mockReturnValue(true);
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
    authService.hasAnyRole.mockReturnValue(true);
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
    authService.hasAnyRole.mockReturnValue(true);
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
    authService.hasAnyRole.mockReturnValue(true);
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
    authService.hasAnyRole.mockReturnValue(true);
    vetService.getAll.mockReturnValue(of([veterinarian]));
    branchService.getAll.mockReturnValue(throwError(() => ({ status: 500 })));

    createComponent();

    expect(component.branchesLoadError()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'No pudimos cargar las sucursales para el filtro.',
    );
    expect(component.veterinarians()).toEqual([veterinarian]);
  });

  it('muestra las acciones administrativas solo para ADMIN', () => {
    vetService.getAll.mockReturnValue(of([veterinarian]));
    branchService.getAll.mockReturnValue(of([]));
    authService.hasAnyRole.mockReturnValue(true);

    createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Registrar veterinario');
    expect(text).toContain('Editar');
    expect(text).toContain('Eliminar');
  });

  it('oculta las acciones administrativas para otros roles', () => {
    vetService.getAll.mockReturnValue(of([veterinarian]));
    branchService.getAll.mockReturnValue(of([]));

    createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('Registrar veterinario');
    expect(text).not.toContain('Editar');
    expect(text).not.toContain('Eliminar');
    expect(text).toContain('Ver detalle');
  });

  it('acepta DTO público sin consultar sucursales ni enviar matrícula aunque el formulario conserve un valor', () => {
    vetService.getAll.mockReturnValue(of([{
      externalId: 'vet-1', firstName: 'Juan', lastName: 'Pérez',
      workStartTime: '08:00', workEndTime: '16:00', workDays: ['MONDAY'],
    }]));
    createComponent();
    component.filtersForm.patchValue({ licenseNumber: 'MN-1234', branchExternalId: 'branch-1' });
    component.loadVeterinarians();
    fixture.detectChanges();
    expect(branchService.getAll).not.toHaveBeenCalled();
    expect(vetService.getAll).toHaveBeenLastCalledWith({
      firstName: '', lastName: '', licenseNumber: undefined, branchExternalId: undefined,
    });
    expect(fixture.nativeElement.querySelector('#filter-license-number')).toBeNull();
    expect(fixture.nativeElement.querySelector('.status-badge')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('MN-1234');
    expect(fixture.nativeElement.textContent).toContain('Juan');
  });

  it('no ofrece eliminar a un veterinario ya inactivo', () => {
    vetService.getAll.mockReturnValue(
      of([{ ...veterinarian, active: false }]),
    );
    branchService.getAll.mockReturnValue(of([]));
    authService.hasAnyRole.mockReturnValue(true);

    createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Editar');
    expect(text).not.toContain('Eliminar');
  });

  it('pide confirmación y recarga el listado tras dar de baja', () => {
    vetService.getAll.mockReturnValue(of([veterinarian]));
    branchService.getAll.mockReturnValue(of([]));
    vetService.delete.mockReturnValue(of(undefined));
    authService.hasAnyRole.mockReturnValue(true);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    createComponent();
    vetService.getAll.mockClear();

    component.deleteVeterinarian(veterinarian);

    expect(confirmSpy).toHaveBeenCalled();
    expect(vetService.delete).toHaveBeenCalledWith('vet-1');
    expect(vetService.getAll).toHaveBeenCalled();
    expect(component.deletingId()).toBeNull();
  });

  it('no elimina si se cancela la confirmación', () => {
    vetService.getAll.mockReturnValue(of([veterinarian]));
    branchService.getAll.mockReturnValue(of([]));
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    createComponent();

    component.deleteVeterinarian(veterinarian);

    expect(vetService.delete).not.toHaveBeenCalled();
  });

  it('muestra el error cuando el veterinario ya está inactivo', () => {
    authService.hasAnyRole.mockReturnValue(true);
    vetService.getAll.mockReturnValue(of([veterinarian]));
    branchService.getAll.mockReturnValue(of([]));
    vetService.delete.mockReturnValue(throwError(() => ({ status: 409 })));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    createComponent();

    component.deleteVeterinarian(veterinarian);
    fixture.detectChanges();

    expect(component.deleteError()).toBe('El veterinario ya está inactivo.');
    expect(fixture.nativeElement.textContent).toContain(
      'El veterinario ya está inactivo.',
    );
    expect(component.deletingId()).toBeNull();
  });

  describe('reactivación del perfil', () => {
    const inactive = { ...veterinarian, active: false };

    beforeEach(() => {
      vetService.getAll.mockReturnValue(of([inactive]));
      branchService.getAll.mockReturnValue(of([]));
    });

    it('ofrece Reactivar solo a ADMIN con perfil inactivo, no por UPDATE_USERS', () => {
      authService.hasAnyPermission.mockReturnValue(true);
      createComponent();
      expect(fixture.nativeElement.querySelector('.reactivate-button')).toBeNull();
      expect(component.isAdmin()).toBe(false);
      expect(authService.hasAnyRole).toHaveBeenCalledWith(['ROLE_ADMIN']);
      authService.hasAnyRole.mockReturnValue(true);
      fixture = TestBed.createComponent(VeterinarianList);
      component = fixture.componentInstance;
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.reactivate-button')).not.toBeNull();
      component.veterinarians.set([veterinarian]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.reactivate-button')).toBeNull();
    });

    it('cancela sin solicitar y bloquea doble clic; usa DTO y respeta filtro', () => {
      authService.hasAnyRole.mockReturnValue(true);
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
      createComponent();
      component.reactivateVeterinarian(inactive);
      expect(vetService.reactivate).not.toHaveBeenCalled();
      confirm.mockReturnValue(true);
      const pending = new Subject<VeterinarianResponse>();
      vetService.reactivate.mockReturnValue(pending);
      component.updateStatusFilter({ target: { value: 'INACTIVE' } } as unknown as Event);
      component.reactivateVeterinarian(inactive);
      component.reactivateVeterinarian(inactive);
      expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Juan Pérez'));
      expect(vetService.reactivate).toHaveBeenCalledExactlyOnceWith('vet-1');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Reactivando...');
      expect(fixture.nativeElement.querySelector('.reactivate-button').disabled).toBe(true);
      pending.next({ ...veterinarian, firstName: 'Juana' });
      pending.complete();
      fixture.detectChanges();
      expect(component.veterinarians()[0].firstName).toBe('Juana');
      expect(component.filteredVeterinarians()).toEqual([]);
      expect(fixture.nativeElement.textContent).toContain('Se reactivó el perfil veterinario de Juana Pérez');
      expect(component.reactivatingId()).toBeNull();
    });

    it.each([409, 404, 401, 403])('mantiene el perfil y permite reintentar tras %i', (status) => {
      authService.hasAnyRole.mockReturnValue(true);
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vetService.reactivate.mockReturnValue(throwError(() => ({ status, error: status === 409 ? { message: 'La cuenta asociada está inactiva.' } : {} })));
      createComponent();
      component.reactivateVeterinarian(inactive);
      expect(component.veterinarians()).toEqual([inactive]);
      expect(component.reactivatingId()).toBeNull();
      expect(component.reactivateError()).toBeTruthy();
      if (status === 409) expect(component.reactivateError()).toBe('La cuenta asociada está inactiva.');
      component.reactivateVeterinarian(inactive);
      expect(vetService.reactivate).toHaveBeenCalledTimes(2);
    });
  });
});
