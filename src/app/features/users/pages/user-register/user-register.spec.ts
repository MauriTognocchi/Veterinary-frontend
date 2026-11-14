import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { BranchService } from '../../../branches/services/branch';
import { OwnerService } from '../../../owners/services/owner';
import { UserRegistrationService } from '../../services/user-registration';
import { UserRegister } from './user-register';

const BRANCH = {
  externalId: 'branch-1',
  name: 'Sucursal Centro',
  phone: '11 5555-1234',
  email: 'centro@veterinaria.com',
  openingTime: '08:00:00',
  closingTime: '18:00:00',
  address: null,
};

describe('UserRegister', () => {
  let fixture: ComponentFixture<UserRegister>;
  let component: UserRegister;
  let branchService: { getAll: ReturnType<typeof vi.fn> };
  let registrationService: {
    createVeterinarian: ReturnType<typeof vi.fn>;
    createReceptionist: ReturnType<typeof vi.fn>;
  };
  let ownerService: {
    createWithCredentials: ReturnType<typeof vi.fn>;
  };
  let routeData: Record<string, unknown>;
  let queryParams: Record<string, string>;

  const createdUser = {
    externalId: 'user-1',
    firstName: 'Ana',
    lastName: 'Pérez',
    email: 'ana@example.com',
  };

  const createdOwner = {
    externalId: 'owner-1',
    firstName: 'Ana',
    lastName: 'Gómez',
    phone: '11 5555-1234',
    email: 'ana@example.com',
    dni: '30123456',
    address: null,
  };

  function createComponent(): void {
    fixture = TestBed.createComponent(UserRegister);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function fillVeterinarianForm(): void {
    component.userForm.setValue({
      role: 'VETERINARIAN',
      firstName: '  Ana  ',
      lastName: '  Pérez  ',
      phone: '  11 5555-1234  ',
      email: 'ana@example.com',
      dni: '',
      address: {
        street: '',
        number: '',
        city: '',
        province: '',
        country: '',
      },
      password: 'secreto',
      branchExternalId: 'branch-1',
      licenseNumber: '  MP 1234  ',
      workStartTime: '08:00',
      workEndTime: '16:00',
      workDays: {
        MONDAY: true,
        TUESDAY: false,
        WEDNESDAY: true,
        THURSDAY: false,
        FRIDAY: false,
        SATURDAY: false,
        SUNDAY: false,
      },
    });
  }

  function fillReceptionistForm(): void {
    component.userForm.setValue({
      role: 'RECEPTIONIST',
      firstName: '  Ana  ',
      lastName: '  Pérez  ',
      phone: '  11 5555-1234  ',
      email: 'ana@example.com',
      dni: '',
      address: {
        street: '',
        number: '',
        city: '',
        province: '',
        country: '',
      },
      password: 'secreto',
      branchExternalId: 'branch-1',
      licenseNumber: '',
      workStartTime: '',
      workEndTime: '',
      workDays: {
        MONDAY: false,
        TUESDAY: false,
        WEDNESDAY: false,
        THURSDAY: false,
        FRIDAY: false,
        SATURDAY: false,
        SUNDAY: false,
      },
    });
  }

  function fillOwnerForm(): void {
    component.userForm.patchValue({
      firstName: '  Ana  ',
      lastName: '  Gómez  ',
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
    });
  }

  beforeEach(async () => {
    routeData = {};
    queryParams = {};

    branchService = { getAll: vi.fn().mockReturnValue(of([BRANCH])) };
    registrationService = {
      createVeterinarian: vi.fn(),
      createReceptionist: vi.fn(),
    };
    ownerService = {
      createWithCredentials: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [UserRegister],
      providers: [
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: routeData,
              queryParams,
              paramMap: { get: () => null },
              queryParamMap: { get: () => null },
            },
          },
        },
        { provide: BranchService, useValue: branchService },
        { provide: UserRegistrationService, useValue: registrationService },
        { provide: OwnerService, useValue: ownerService },
      ],
    }).compileComponents();
  });

  it('carga las sucursales disponibles', () => {
    createComponent();

    expect(branchService.getAll).toHaveBeenCalled();
    expect(component.branches()).toEqual([BRANCH]);
    expect(component.loadingBranches()).toBe(false);
  });

  it('valida los campos obligatorios sin llamar al servicio', () => {
    createComponent();

    component.onSubmit();

    expect(component.userForm.invalid).toBe(true);
    expect(registrationService.createVeterinarian).not.toHaveBeenCalled();
    expect(registrationService.createReceptionist).not.toHaveBeenCalled();
    expect(ownerService.createWithCredentials).not.toHaveBeenCalled();
  });

  it('registra un veterinario con los días seleccionados', () => {
    registrationService.createVeterinarian.mockReturnValue(of(createdUser));
    createComponent();
    fillVeterinarianForm();

    component.onSubmit();

    expect(registrationService.createVeterinarian).toHaveBeenCalledWith({
      firstName: 'Ana',
      lastName: 'Pérez',
      phone: '11 5555-1234',
      email: 'ana@example.com',
      password: 'secreto',
      branchExternalId: 'branch-1',
      licenseNumber: 'MP 1234',
      workStartTime: '08:00',
      workEndTime: '16:00',
      workDays: ['MONDAY', 'WEDNESDAY'],
    });
    expect(component.success()).toBe(
      'Usuario Ana Pérez registrado correctamente.',
    );
    expect(component.userForm.enabled).toBe(true);
  });

  it('deshabilita los datos de veterinario al elegir recepcionista', () => {
    registrationService.createReceptionist.mockReturnValue(of(createdUser));
    createComponent();
    fillReceptionistForm();

    expect(component.isVeterinarian()).toBe(false);
    expect(component.userForm.get('licenseNumber')?.disabled).toBe(true);
    expect(component.userForm.get('workDays')?.disabled).toBe(true);

    component.onSubmit();

    expect(registrationService.createReceptionist).toHaveBeenCalledWith({
      firstName: 'Ana',
      lastName: 'Pérez',
      phone: '11 5555-1234',
      email: 'ana@example.com',
      password: 'secreto',
      branchExternalId: 'branch-1',
    });
    expect(registrationService.createVeterinarian).not.toHaveBeenCalled();
  });

  it('muestra el error de duplicado', () => {
    registrationService.createReceptionist.mockReturnValue(
      throwError(() => ({ status: 409 })),
    );
    createComponent();
    fillReceptionistForm();

    component.onSubmit();

    expect(component.error()).toBe(
      'Ya existe un usuario con ese email, teléfono o matrícula.',
    );
    expect(component.userForm.enabled).toBe(true);
  });

  it('activa el modo propietario sin cargar sucursales', () => {
    routeData['mode'] = 'OWNER';
    createComponent();

    expect(component.isOwnerMode()).toBe(true);
    expect(branchService.getAll).not.toHaveBeenCalled();
    expect(component.userForm.get('branchExternalId')?.disabled).toBe(true);
    expect(component.userForm.get('licenseNumber')?.disabled).toBe(true);
    expect(component.userForm.get('dni')?.enabled).toBe(true);
    expect(component.userForm.get('address')?.enabled).toBe(true);
    expect(fixture.nativeElement.querySelector('#dni')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#street')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#role')).toBeNull();
    expect(fixture.nativeElement.querySelector('#branchExternalId')).toBeNull();
    expect(fixture.nativeElement.querySelector('#licenseNumber')).toBeNull();
  });

  it('registra un propietario con credenciales', () => {
    routeData['mode'] = 'OWNER';
    ownerService.createWithCredentials.mockReturnValue(of(createdOwner));
    createComponent();
    fillOwnerForm();

    component.onSubmit();

    expect(ownerService.createWithCredentials).toHaveBeenCalledWith({
      firstName: 'Ana',
      lastName: 'Gómez',
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
    expect(registrationService.createVeterinarian).not.toHaveBeenCalled();
    expect(registrationService.createReceptionist).not.toHaveBeenCalled();
    expect(component.success()).toContain('Propietario Ana Gómez');
    expect(component.userForm.get('dni')?.enabled).toBe(true);
    expect(component.userForm.get('branchExternalId')?.disabled).toBe(true);
  });

  it('muestra el error de duplicado en modo propietario', () => {
    routeData['mode'] = 'OWNER';
    ownerService.createWithCredentials.mockReturnValue(
      throwError(() => ({ status: 409 })),
    );
    createComponent();
    fillOwnerForm();

    component.onSubmit();

    expect(component.error()).toBe(
      'Ya existe un propietario o usuario con ese email o DNI.',
    );
    expect(component.userForm.get('dni')?.enabled).toBe(true);
  });

  it('permite mostrar y ocultar la contraseña', () => {
    routeData['mode'] = 'OWNER';
    createComponent();

    const input = fixture.nativeElement.querySelector(
      '#password',
    ) as HTMLInputElement;

    expect(input.type).toBe('password');
    expect(component.showPassword()).toBe(false);

    component.togglePasswordVisibility();
    fixture.detectChanges();

    expect(component.showPassword()).toBe(true);
    expect(input.type).toBe('text');
  });
});
