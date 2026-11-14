import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { BranchService } from '../../../branches/services/branch';
import { VeterinarianResponse } from '../../models/veterinarian.model';
import { VeterinarianService } from '../../services/veterinarian';
import { VeterinarianForm } from './veterinarian-form';

describe('VeterinarianForm', () => {
  let fixture: ComponentFixture<VeterinarianForm>;
  let component: VeterinarianForm;
  let service: {
    getById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let branchService: { getAll: ReturnType<typeof vi.fn> };
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

  const branch = {
    externalId: 'branch-1',
    name: 'Sucursal Centro',
    phone: '11 5555-1234',
    email: 'centro@veterinaria.com',
    openingTime: '08:00:00',
    closingTime: '18:00:00',
    address: null,
  };

  function createComponent(): void {
    fixture = TestBed.createComponent(VeterinarianForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function fillValidForm(): void {
    component.veterinarianForm.patchValue({
      firstName: '  Juan  ',
      lastName: ' Pérez ',
      licenseNumber: ' MN-1234 ',
      phone: ' 11 5555-6789 ',
      email: 'jperez@veterinaria.com',
      workStartTime: '09:00',
      workEndTime: '17:00',
      workDays: {
        MONDAY: true,
        TUESDAY: false,
        WEDNESDAY: true,
        THURSDAY: false,
        FRIDAY: false,
        SATURDAY: false,
        SUNDAY: false,
      },
      branchExternalId: 'branch-1',
    });
  }

  beforeEach(async () => {
    service = {
      getById: vi.fn(),
      update: vi.fn(),
    };
    branchService = { getAll: vi.fn().mockReturnValue(of([branch])) };
    router = { navigate: vi.fn().mockResolvedValue(true) };

    const route = {
      snapshot: {
        paramMap: {
          get: (key: string) => (key === 'externalId' ? 'vet-1' : null),
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [VeterinarianForm],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        { provide: VeterinarianService, useValue: service },
        { provide: BranchService, useValue: branchService },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('carga los datos del veterinario en el formulario', () => {
    service.getById.mockReturnValue(of(veterinarian));

    createComponent();

    expect(service.getById).toHaveBeenCalledWith('vet-1');
    expect(component.veterinarianForm.get('firstName')?.value).toBe('Juan');
    expect(component.veterinarianForm.get('workStartTime')?.value).toBe('08:00');
    expect(component.veterinarianForm.get('workEndTime')?.value).toBe('16:00');
    expect(component.veterinarianForm.get('workDays.MONDAY')?.value).toBe(true);
    expect(component.veterinarianForm.get('workDays.WEDNESDAY')?.value).toBe(
      true,
    );
    expect(component.veterinarianForm.get('workDays.FRIDAY')?.value).toBe(false);
    expect(component.veterinarianForm.get('branchExternalId')?.value).toBe(
      'branch-1',
    );
  });

  it('no envía el formulario si faltan campos obligatorios', () => {
    service.getById.mockReturnValue(of(veterinarian));

    createComponent();

    component.veterinarianForm.patchValue({ firstName: '' });
    component.onSubmit();

    expect(service.update).not.toHaveBeenCalled();
    expect(component.veterinarianForm.get('firstName')?.touched).toBe(true);
  });

  it('valida el formato del email', () => {
    service.getById.mockReturnValue(of(veterinarian));

    createComponent();

    component.veterinarianForm.patchValue({ email: 'no-es-email' });

    expect(component.veterinarianForm.get('email')?.invalid).toBe(true);
  });

  it('valida que la hora de fin sea posterior a la de inicio', () => {
    service.getById.mockReturnValue(of(veterinarian));

    createComponent();

    component.veterinarianForm.patchValue({
      workStartTime: '16:00',
      workEndTime: '08:00',
    });

    expect(component.veterinarianForm.hasError('timeRange')).toBe(true);

    component.onSubmit();
    fixture.detectChanges();

    expect(service.update).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'La hora de fin debe ser posterior a la hora de inicio.',
    );
  });

  it('envía el payload completo sin password y vuelve al detalle', () => {
    service.getById.mockReturnValue(of(veterinarian));
    service.update.mockReturnValue(of(veterinarian));

    createComponent();
    fillValidForm();
    component.onSubmit();

    expect(service.update).toHaveBeenCalledWith('vet-1', {
      firstName: 'Juan',
      lastName: 'Pérez',
      licenseNumber: 'MN-1234',
      phone: '11 5555-6789',
      email: 'jperez@veterinaria.com',
      workStartTime: '09:00',
      workEndTime: '17:00',
      workDays: ['MONDAY', 'WEDNESDAY'],
      branchExternalId: 'branch-1',
    });

    const payload = service.update.mock.calls[0][1];
    expect('password' in payload).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/veterinarians', 'vet-1']);
  });

  it('omite branchExternalId si se mantiene la sucursal actual', () => {
    service.getById.mockReturnValue(of(veterinarian));
    service.update.mockReturnValue(of(veterinarian));

    createComponent();
    fillValidForm();
    component.veterinarianForm.patchValue({ branchExternalId: '' });
    component.onSubmit();

    const payload = service.update.mock.calls[0][1];
    expect('branchExternalId' in payload).toBe(false);
  });

  it('muestra el error de datos duplicados', () => {
    service.getById.mockReturnValue(of(veterinarian));
    service.update.mockReturnValue(throwError(() => ({ status: 409 })));

    createComponent();
    fillValidForm();
    component.onSubmit();

    expect(component.error()).toBe(
      'Ya existe un veterinario con ese email, matrícula o teléfono.',
    );
    expect(component.veterinarianForm.enabled).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('muestra el error de permisos al guardar', () => {
    service.getById.mockReturnValue(of(veterinarian));
    service.update.mockReturnValue(throwError(() => ({ status: 403 })));

    createComponent();
    fillValidForm();
    component.onSubmit();

    expect(component.error()).toBe(
      'No tenés permisos para editar veterinarios.',
    );
  });

  it('muestra el estado no encontrado al cargar', () => {
    service.getById.mockReturnValue(throwError(() => ({ status: 404 })));

    createComponent();

    expect(component.notFound()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'No encontramos el veterinario solicitado.',
    );
  });
});
