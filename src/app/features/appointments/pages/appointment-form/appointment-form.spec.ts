import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  provideRouter,
} from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { BranchService } from '../../../branches/services/branch';
import { PetResponse } from '../../../pets/models/pet.model';
import { PetService } from '../../../pets/services/pet';
import { VeterinarianResponse } from '../../../veterinarians/models/veterinarian.model';
import { VeterinarianService } from '../../../veterinarians/services/veterinarian';
import { AppointmentResponse } from '../../models/appointment.model';
import { AppointmentService } from '../../services/appointment';
import { AppointmentForm } from './appointment-form';

describe('AppointmentForm', () => {
  let component: AppointmentForm;
  let fixture: ComponentFixture<AppointmentForm>;
  let appointmentService: {
    getById: ReturnType<typeof vi.fn>;
    getAvailableSlots: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let branchService: { getAll: ReturnType<typeof vi.fn> };
  let veterinarianService: { getAll: ReturnType<typeof vi.fn> };
  let petService: {
    getAll: ReturnType<typeof vi.fn>;
    getMyPets: ReturnType<typeof vi.fn>;
  };
  let authService: { hasRole: ReturnType<typeof vi.fn> };
  let router: Router;
  let routeExternalId: string | null;

  const pet: PetResponse = {
    externalId: 'pet-1',
    name: 'Firulais',
    birthDate: '2020-05-05',
    active: true,
    color: 'Marrón',
    animalType: { externalId: 'animal-type-1', name: 'Perro' },
    breed: {
      externalId: 'breed-1',
      name: 'Labrador',
      animalType: { externalId: 'animal-type-1', name: 'Perro' },
    },
  };

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
    branch: null,
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

  const appointment: AppointmentResponse = {
    externalId: 'appointment-1',
    appointmentDate: '2026-11-11T14:30:00',
    durationMinutes: 30,
    reason: 'Consulta general',
    status: 'CONFIRMED',
    pet,
    veterinarian,
    branch,
  };

  const validFormValue = {
    branchExternalId: 'branch-1',
    veterinarianExternalId: 'vet-1',
    date: '2026-11-11',
    time: '14:30',
    petExternalId: 'pet-1',
    durationMinutes: 30,
    reason: 'Consulta general',
  };

  function createComponent(): void {
    fixture = TestBed.createComponent(AppointmentForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function submitLabel(): string {
    const button = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement | null;
    return button?.textContent?.trim() ?? '';
  }

  beforeEach(async () => {
    routeExternalId = null;
    appointmentService = {
      getById: vi.fn().mockReturnValue(of(appointment)),
      getAvailableSlots: vi.fn().mockReturnValue(of([])),
      create: vi.fn().mockReturnValue(of(appointment)),
      update: vi.fn().mockReturnValue(of(appointment)),
    };
    branchService = { getAll: vi.fn().mockReturnValue(of([branch])) };
    veterinarianService = { getAll: vi.fn().mockReturnValue(of([veterinarian])) };
    petService = {
      getAll: vi.fn().mockReturnValue(of([pet])),
      getMyPets: vi.fn().mockReturnValue(of([pet])),
    };
    authService = { hasRole: vi.fn().mockReturnValue(false) };

    await TestBed.configureTestingModule({
      imports: [AppointmentForm],
      providers: [
        provideRouter([]),
        { provide: AppointmentService, useValue: appointmentService },
        { provide: BranchService, useValue: branchService },
        { provide: VeterinarianService, useValue: veterinarianService },
        { provide: PetService, useValue: petService },
        { provide: AuthService, useValue: authService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => routeExternalId,
              },
            },
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('se crea correctamente', () => {
    createComponent();

    expect(component).toBeTruthy();
  });

  it('no incluye un control de estado editable', () => {
    createComponent();

    expect(component.appointmentForm.get('status')).toBeNull();
    expect(fixture.nativeElement.querySelector('#status')).toBeNull();
  });

  it('muestra Crear turno en modo alta', () => {
    createComponent();

    expect(submitLabel()).toBe('Crear turno');
  });

  it('envía el estado actual del turno al actualizar', () => {
    routeExternalId = 'appointment-1';

    createComponent();
    component.onSubmit();

    expect(appointmentService.update).toHaveBeenCalledWith(
      'appointment-1',
      expect.objectContaining({
        status: 'CONFIRMED',
        appointmentDate: '2026-11-11T14:30:00',
        reason: 'Consulta general',
      }),
    );
    expect(router.navigate).toHaveBeenCalledWith(['/appointments']);
  });

  it('crea un turno sin enviar estado', () => {
    createComponent();
    component.appointmentForm.setValue(validFormValue);

    component.onSubmit();

    expect(appointmentService.create).toHaveBeenCalledWith({
      appointmentDate: '2026-11-11T14:30:00',
      durationMinutes: 30,
      reason: 'Consulta general',
      petExternalId: 'pet-1',
      veterinarianExternalId: 'vet-1',
      branchExternalId: 'branch-1',
    });
    expect(router.navigate).toHaveBeenCalledWith(['/appointments']);
  });

  it('muestra un mensaje de sesión expirada ante un 401', () => {
    appointmentService.create.mockReturnValue(
      throwError(() => ({ status: 401 })),
    );

    createComponent();
    component.appointmentForm.setValue(validFormValue);
    component.onSubmit();

    expect(component.error()).toBe(
      'Tu sesión expiró. Iniciá sesión nuevamente.',
    );
  });

  it('muestra un mensaje de permisos ante un 403', () => {
    appointmentService.create.mockReturnValue(
      throwError(() => ({ status: 403 })),
    );

    createComponent();
    component.appointmentForm.setValue(validFormValue);
    component.onSubmit();

    expect(component.error()).toBe(
      'No tenés permisos para realizar esta acción.',
    );
  });

  it('muestra un mensaje de conflicto ante un 409 genérico', () => {
    appointmentService.create.mockReturnValue(
      throwError(() => ({ status: 409 })),
    );

    createComponent();
    component.appointmentForm.setValue(validFormValue);
    component.onSubmit();

    expect(component.error()).toBe(
      'El turno entra en conflicto con otro existente. Revisá el horario.',
    );
  });
});
