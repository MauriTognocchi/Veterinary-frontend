import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ANIMAL_TYPE_ADMIN_ROLES } from '../../../core/models/auth.model';
import { AuthService } from '../../../core/services/auth';
import {
  AppointmentResponse,
  AppointmentStatus,
} from '../../../features/appointments/models/appointment.model';
import { AppointmentService } from '../../../features/appointments/services/appointment';
import { OwnerByPetResponse } from '../../../features/owners-by-pets/models/owner-by-pet.model';
import { OwnerByPetService } from '../../../features/owners-by-pets/services/owner-by-pet';
import { PetResponse } from '../../../features/pets/models/pet.model';
import { PetService } from '../../../features/pets/services/pet';

interface AdminLink {
  readonly label: string;
  readonly path: string;
}

interface QuickAccess {
  readonly label: string;
  readonly description: string;
  readonly path: string;
}

@Component({
  imports: [RouterLink],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly appointmentService = inject(AppointmentService);
  private readonly ownerByPetService = inject(OwnerByPetService);
  private readonly petService = inject(PetService);

  readonly isAdmin = computed(() =>
    this.authService.hasAnyRole(ANIMAL_TYPE_ADMIN_ROLES),
  );
  readonly isVeterinarian = computed(() =>
    this.authService.hasAnyRole(['ROLE_VETERINARIAN']),
  );
  readonly isReceptionist = computed(() =>
    this.authService.hasAnyRole(['ROLE_RECEPTIONIST']),
  );
  readonly isClient = computed(() =>
    this.authService.hasAnyRole(['ROLE_CLIENT']),
  );

  readonly todayAppointments = signal<AppointmentResponse[]>([]);
  readonly loadingAppointments = signal(false);
  readonly appointmentsError = signal<string | null>(null);
  readonly ownerPets = signal<PetResponse[]>([]);
  readonly loadingPets = signal(false);
  readonly petsError = signal<string | null>(null);
  private readonly ownerByPet = signal<OwnerByPetResponse[]>([]);

  private readonly statusLabels: Record<AppointmentStatus, string> = {
    PENDING: 'Pendiente',
    CONFIRMED: 'Confirmado',
    COMPLETED: 'Completado',
    CANCELLED: 'Cancelado',
  };

  readonly receptionistActions: readonly QuickAccess[] = [
    {
      label: 'NUEVO TURNO',
      description: 'Registrar turno',
      path: '/appointments/new',
    },
    {
      label: 'CREAR PROPIETARIO',
      description: 'Registrar propietario con acceso al sistema',
      path: '/owners/new/account',
    },
    {
      label: 'NUEVA MASCOTA',
      description: 'Registrar mascota',
      path: '/pets/new',
    },
    {
      label: 'BUSCAR MASCOTA',
      description: 'Consultar pacientes',
      path: '/pets',
    },
    {
      label: 'BUSCAR PROPIETARIO',
      description: 'Consultar información',
      path: '/owners',
    },
  ];

  readonly receptionistQueries: readonly QuickAccess[] = [
    {
      label: 'SUCURSALES',
      description: 'Consultar sucursales',
      path: '/branches',
    },
    {
      label: 'VETERINARIOS',
      description: 'Consultar profesionales',
      path: '/veterinarians',
    },
  ];

  readonly quickAccess: readonly QuickAccess[] = [
    {
      label: 'ESTUDIOS',
      description: 'Gestionar estudios clínicos',
      path: '/studies',
    },
    {
      label: 'BUSCAR MASCOTA',
      description: 'Consultar pacientes',
      path: '/pets',
    },
    {
      label: 'BUSCAR PROPIETARIO',
      description: 'Consultar propietarios',
      path: '/owners',
    },
    {
      label: 'HISTORIAL DE VISITAS',
      description: 'Consultar atenciones anteriores',
      path: '/visits',
    },
  ];

  readonly ownerQuickAccess: readonly QuickAccess[] = [
    {
      label: 'SOLICITAR TURNO',
      description: 'Solicitar una nueva atención veterinaria',
      path: '/appointments/new',
    },
    {
      label: 'MIS TURNOS',
      description: 'Consultar y filtrar mis turnos',
      path: '/appointments',
    },
    {
      label: 'HISTORIAL CLÍNICO',
      description: 'Consultar las visitas de tus mascotas',
      path: '/visits',
    },
    {
      label: 'SUCURSALES',
      description: 'Conocer nuestras sucursales',
      path: '/branches',
    },
  ];

  readonly gestionLinks: readonly AdminLink[] = [
    { label: 'Propietarios', path: '/owners' },
    { label: 'Mascotas', path: '/pets' },
    { label: 'Visitas', path: '/visits' },
  ];

  readonly personalLinks: readonly AdminLink[] = [
    { label: 'Usuarios', path: '/users' },
    { label: 'Veterinarios', path: '/veterinarians' },
    { label: 'Recepcionistas', path: '/receptionists' },
  ];

  readonly configuracionLinks: readonly AdminLink[] = [
    { label: 'Sucursales', path: '/branches' },
    { label: 'Medicamentos', path: '/medications' },
    { label: 'Tipos de animales', path: '/animal-types' },
    { label: 'Razas', path: '/breeds' },
  ];

  ngOnInit(): void {
    if (
      (this.isVeterinarian() || this.isReceptionist()) &&
      !this.isAdmin()
    ) {
      this.loadTodayAppointments();
      this.loadOwnerRelations();
    }

    if (this.isClient()) {
      this.loadOwnerPets();
    }
  }

  loadOwnerPets(): void {
    this.loadingPets.set(true);
    this.petsError.set(null);
    this.ownerPets.set([]);

    this.petService.getMyPets().subscribe({
      next: (pets) => {
        this.ownerPets.set(pets.filter((pet) => pet.active !== false));
        this.loadingPets.set(false);
      },
      error: (err) => {
        this.loadingPets.set(false);
        this.petsError.set(this.petsErrorMessage(err?.status));
      },
    });
  }

  retryLoadPets(): void {
    this.loadOwnerPets();
  }

  petPhotoUrl(pet: PetResponse): string | null {
    const photoUrl = (pet as PetResponse & { photoUrl?: string | null })
      .photoUrl;

    return typeof photoUrl === 'string' && photoUrl.trim()
      ? photoUrl.trim()
      : null;
  }

  petTypeLabel(pet: PetResponse): string {
    const typeName = pet.animalType?.name?.trim();

    return typeName || 'Tipo no disponible';
  }

  loadTodayAppointments(): void {
    const today = this.todayKey();

    this.loadingAppointments.set(true);
    this.appointmentsError.set(null);
    this.todayAppointments.set([]);

    this.appointmentService.getAll({ dateFrom: today, dateTo: today }).subscribe({
      next: (appointments) => {
        const todayOnly = appointments
          .filter(
            (appointment) =>
              appointment.appointmentDate?.slice(0, 10) === today,
          )
          .sort((first, second) =>
            first.appointmentDate.localeCompare(second.appointmentDate),
          );

        this.todayAppointments.set(todayOnly);
        this.loadingAppointments.set(false);
      },
      error: (err) => {
        this.loadingAppointments.set(false);
        this.appointmentsError.set(this.appointmentsErrorMessage(err?.status));
      },
    });
  }

  retryLoad(): void {
    this.loadTodayAppointments();
  }

  private loadOwnerRelations(): void {
    this.ownerByPetService
      .getAll()
      .pipe(catchError(() => of([] as OwnerByPetResponse[])))
      .subscribe({
        next: (relations) => this.ownerByPet.set(relations),
      });
  }

  ownerName(petExternalId: string | undefined): string {
    if (!petExternalId) {
      return 'No disponible';
    }

    const relation = this.ownerByPet().find(
      (item) => item.pet?.externalId === petExternalId,
    );

    if (!relation?.owner) {
      return 'No disponible';
    }

    const name =
      `${relation.owner.firstName} ${relation.owner.lastName}`.trim();

    return name || 'No disponible';
  }

  formatTime(appointmentDate: string): string {
    const time = appointmentDate?.split('T')[1];

    return time ? time.slice(0, 5) : '—';
  }

  veterinarianName(
    veterinarian: AppointmentResponse['veterinarian'],
  ): string {
    if (!veterinarian) {
      return 'No disponible';
    }

    const name = `${veterinarian.firstName} ${veterinarian.lastName}`.trim();

    return name || 'No disponible';
  }

  statusLabel(status: AppointmentStatus): string {
    return this.statusLabels[status] ?? status;
  }

  statusClass(status: AppointmentStatus): string {
    return `status-badge is-${status.toLowerCase()}`;
  }

  private todayKey(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private petsErrorMessage(status: number | undefined): string {
    if (status === 401) {
      return 'No tenés autorización para ver tus mascotas. Iniciá sesión nuevamente.';
    }

    if (status === 403) {
      return 'No tenés permisos para ver tus mascotas.';
    }

    if (status === 0) {
      return 'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.';
    }

    return 'No pudimos cargar tus mascotas. Intentá nuevamente.';
  }

  private appointmentsErrorMessage(status: number | undefined): string {
    if (status === 401) {
      return 'No tenés autorización para ver los turnos. Iniciá sesión nuevamente.';
    }

    if (status === 403) {
      return 'No tenés permisos para ver los turnos.';
    }

    if (status === 0) {
      return 'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.';
    }

    return 'No pudimos cargar los turnos de hoy.';
  }
}
