import {
      Component,
      ElementRef,
      OnInit,
      computed,
      inject,
      signal,
      viewChild,
    } from '@angular/core';
    import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
    import { RouterLink } from '@angular/router';
    import { AuthService } from '../../../../core/services/auth';
    import { PetResponse } from '../../../pets/models/pet.model';
    import { PetService } from '../../../pets/services/pet';
    import { VeterinarianResponse } from
    '../../../veterinarians/models/veterinarian.model';
    import { VeterinarianService } from
    '../../../veterinarians/services/veterinarian';
    import {
      AppointmentFilters,
      AppointmentResponse,
      AppointmentStatus,
    } from '../../models/appointment.model';
    import { AppointmentService } from '../../services/appointment';

    @Component({
      selector: 'app-appointment-list',
      standalone: true,
      imports: [ReactiveFormsModule, RouterLink],
      styleUrl: './appointment-list.css',
      templateUrl: './appointment-list.html',
    })
    export class AppointmentList implements OnInit {
      private fb = inject(FormBuilder);
      private appointmentService = inject(AppointmentService);
      private petService = inject(PetService);
      private veterinarianService = inject(VeterinarianService);
      private authService = inject(AuthService);
      private listHeading =
      viewChild<ElementRef<HTMLElement>>('listHeading');

      private readonly statusLabels: Record<AppointmentStatus, string>
      = {
        PENDING: 'Pendiente',
        CONFIRMED: 'Confirmado',
        COMPLETED: 'Completado',
        CANCELLED: 'Cancelado',
      };

      readonly canCreateAppointment = computed(() =>
        this.authService.hasAnyRole(['ROLE_ADMIN', 'ROLE_RECEPTIONIST',
        'ROLE_CLIENT']),
      );
      readonly canEditAppointment = computed(() =>
        this.authService.hasAnyRole(['ROLE_ADMIN',
        'ROLE_RECEPTIONIST']),
      );
      readonly canDeleteAppointment = computed(() =>
        this.authService.hasAnyRole(['ROLE_ADMIN', 'ROLE_RECEPTIONIST',
        'ROLE_CLIENT']),
      );
      readonly isVeterinarian = computed(() =>
        this.authService.hasRole('ROLE_VETERINARIAN'),
      );

      appointments = signal<AppointmentResponse[]>([]);
      pets = signal<PetResponse[]>([]);
      veterinarians = signal<VeterinarianResponse[]>([]);
      loading = signal<boolean>(true);
      error = signal<string | null>(null);
      loadErrorRetryable = signal<boolean>(false);
      appliedFilters = signal<boolean>(false);
      petsLoadError = signal<boolean>(false);
      veterinariansLoadError = signal<boolean>(false);
      filtersError = signal<string | null>(null);

      actionInProgressId = signal<string | null>(null);
      actionError = signal<string | null>(null);

      filtersForm = this.fb.nonNullable.group({
        dateFrom: [''],
        dateTo: [''],
        status: [''],
        petExternalId: [''],
        veterinarianExternalId: [''],
        reason: [''],
      });

      ngOnInit(): void {
        this.loadAppointments();
        this.loadCatalogs();
      }

      loadAppointments(): void {
        if (!this.validateFilters()) {
          return;
        }

        this.loading.set(true);
        this.error.set(null);
        this.loadErrorRetryable.set(false);
        this.appointments.set([]);

        const raw = this.filtersForm.getRawValue();
        const filters: AppointmentFilters = {
          dateFrom: raw.dateFrom,
          dateTo: raw.dateTo,
          status: raw.status as AppointmentStatus | '',
          petExternalId: raw.petExternalId,
          veterinarianExternalId: raw.veterinarianExternalId,
          reason: raw.reason,
        };

        this.appliedFilters.set(
          Boolean(
            filters.dateFrom?.trim() ||
              filters.dateTo?.trim() ||
              filters.status?.trim() ||
              filters.petExternalId?.trim() ||
              filters.veterinarianExternalId?.trim() ||
              filters.reason?.trim(),
          ),
        );

        this.appointmentService.getAll(filters).subscribe({
          next: (appointments) => {
            this.appointments.set(appointments);
            this.loading.set(false);
          },
          error: (err) => {
            this.loading.set(false);

            const status = err?.status;
            const retryable =
              status === 0 || status === 408 || status === 429 || 
              status >= 500;
            this.loadErrorRetryable.set(retryable);

            if (status === 401) {
              this.error.set(
                'No tenés autorización para ver los turnos. Iniciá sesión nuevamente.',
              );
            } else if (status === 403) {
              this.error.set('No tenés permisos para ver los turnos.');
            } else if (status === 404) {
              this.error.set('No encontramos la información solicitada.');
            } else if (status === 0) {
              this.error.set(
                'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
              );
            } else if (status >= 500 || status === 408 || status ===
            429) {
              this.error.set(
                'No pudimos cargar los turnos. Intentá nuevamente en unos minutos.',
              );
            } else {
              this.error.set('No pudimos cargar los turnos.');
            }
          },
        });
      }

      validateFilters(): boolean {
        const { dateFrom, dateTo } = this.filtersForm.getRawValue();

        if (dateFrom && dateTo && dateFrom > dateTo) {
          this.filtersError.set(
            'La fecha inicial debe ser anterior o igual a la fecha final.',
          );
          return false;
        }

        this.filtersError.set(null);
        return true;
      }

      loadCatalogs(): void {
        const isClient = this.authService.hasRole('ROLE_CLIENT');
        const petsRequest$ = isClient
          ? this.petService.getMyPets()
          : this.petService.getAll();

        this.petsLoadError.set(false);
        petsRequest$.subscribe({
          next: (pets) => this.pets.set(pets),
          error: () => {
            this.pets.set([]);
            this.petsLoadError.set(true);
          },
        });

        this.veterinariansLoadError.set(false);
        this.veterinarianService.getAll().subscribe({
          next: (veterinarians) =>
          this.veterinarians.set(veterinarians),
          error: () => {
            this.veterinarians.set([]);
            this.veterinariansLoadError.set(true);
          },
        });
      }

      clearFilters(): void {
        this.filtersForm.reset({
          dateFrom: '',
          dateTo: '',
          status: '',
          petExternalId: '',
          veterinarianExternalId: '',
          reason: '',
        });
        this.filtersError.set(null);
        this.loadAppointments();
        this.listHeading()?.nativeElement.focus();
      }

      retryLoad(): void {
        this.loadAppointments();
        this.listHeading()?.nativeElement.focus();
      }

      confirmAppointment(appointment: AppointmentResponse): void {
        if (this.actionInProgressId() !== null) {
          return;
        }

        this.actionInProgressId.set(appointment.externalId);
        this.actionError.set(null);

        this.appointmentService.confirmAppointment(appointment.externalId).subscribe({
          next: () => {
            this.actionInProgressId.set(null);
            this.loadAppointments();
          },
          error: (err) => {
            this.actionInProgressId.set(null);
            if (err?.status === 403) {
              this.actionError.set('Solo el veterinario puede confirmar el turno.');
            } else {
              this.actionError.set('No pudimos confirmar el turno. Intentá nuevamente.');
            }
          },
        });
      }


      cancelAppointment(appointment: AppointmentResponse): void {
        if (this.actionInProgressId() !== null) {
          return;
        }

        const confirmed = window.confirm(
          `¿Deseás cancelar el turno del
          ${this.formatAppointmentDate(appointment.appointmentDate)}?`,
        );

        if (!confirmed) {
          return;
        }

        this.actionInProgressId.set(appointment.externalId);
        this.actionError.set(null);

        this.appointmentService.delete(appointment.externalId).subscribe({
          next: () => {
            this.actionInProgressId.set(null);
            this.loadAppointments();
          },
          error: (err) => {
            this.actionInProgressId.set(null);
            if (err?.status === 400) {
              this.actionError.set('No se puede cancelar un turno ya completado o cancelado.');
            } else {
              this.actionError.set('No pudimos cancelar el turno.');
            }
          },
        });
      }

      formatAppointmentDate(appointmentDate: string): string {
        const value = appointmentDate?.trim();

        if (!value) {
          return '';
        }

        const [datePart, timePart] = value.split('T');
        const [year, month, day] = datePart?.split('-') ?? [];
        const [hours, minutes] = timePart?.split(':') ?? [];

        if (!year || !month || !day || !hours || !minutes) {
          return value;
        }

        return `${day}/${month}/${year}, ${hours}:${minutes}`;
      }

      statusLabel(status: AppointmentStatus): string {
        return this.statusLabels[status] ?? status;
      }

      statusClass(status: AppointmentStatus): string {
        return `status-badge is-${status.toLowerCase()}`;
      }

      veterinarianName(veterinarian: VeterinarianResponse | null):
      string {
        if (!veterinarian) {
          return 'No disponible';
        }
        const name = `${veterinarian.firstName}
        ${veterinarian.lastName}`.trim();
        return name || 'No disponible';
      }

      petLabel(pet: PetResponse): string {
        const details = [pet.animalType?.name, pet.breed?.name]
          .filter((detail): detail is string =>
          Boolean(detail?.trim()))
          .join(' - ');
        return details ? `${pet.name} (${details})` : pet.name;
      }

      veterinarianLabel(veterinarian: VeterinarianResponse): string {
        const name = `${veterinarian.firstName}
        ${veterinarian.lastName}`.trim();
        const license = veterinarian.licenseNumber?.trim();
        return license ? `${name} (${license})` : name;
      }
    }
