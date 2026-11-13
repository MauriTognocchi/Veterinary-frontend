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

  readonly isAdmin = computed(() =>
    this.authService.hasAnyRole(ANIMAL_TYPE_ADMIN_ROLES),
  );
  readonly isVeterinarian = computed(() =>
    this.authService.hasAnyRole(['ROLE_VETERINARIAN']),
  );

  readonly todayAppointments = signal<AppointmentResponse[]>([]);
  readonly loadingAppointments = signal(false);
  readonly appointmentsError = signal<string | null>(null);
  private readonly ownerByPet = signal<OwnerByPetResponse[]>([]);

  private readonly statusLabels: Record<AppointmentStatus, string> = {
    PENDING: 'Pendiente',
    CONFIRMED: 'Confirmado',
    COMPLETED: 'Completado',
    CANCELLED: 'Cancelado',
  };

  readonly quickAccess: readonly QuickAccess[] = [
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
    { label: 'Condiciones', path: '/conditions' },
    { label: 'Estudios', path: '/studies' },
    { label: 'Medicamentos', path: '/medications' },
    { label: 'Tipos de animales', path: '/animal-types' },
    { label: 'Razas', path: '/breeds' },
  ];

  ngOnInit(): void {
    if (this.isVeterinarian() && !this.isAdmin()) {
      this.loadTodayAppointments();
      this.loadOwnerRelations();
    }
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
