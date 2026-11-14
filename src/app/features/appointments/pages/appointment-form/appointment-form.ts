import {
      Component,
      ElementRef,
      OnInit,
      computed,
      inject,
      signal,
      viewChild,
    } from '@angular/core';
    import {
      FormBuilder,
      FormGroup,
      ReactiveFormsModule,
      Validators,
    } from '@angular/forms';
    import { ActivatedRoute, Router, RouterLink } from
    '@angular/router';
    import { AuthService } from '../../../../core/services/auth';
    import { BranchResponse } from
    '../../../branches/models/branch.model';
    import { BranchService } from '../../../branches/services/branch';
    import { PetResponse } from '../../../pets/models/pet.model';
    import { PetService } from '../../../pets/services/pet';
    import { VeterinarianResponse } from
    '../../../veterinarians/models/veterinarian.model';
    import { VeterinarianService } from
    '../../../veterinarians/services/veterinarian';
    import {
      AppointmentCreateRequest,
      AppointmentResponse,
      AppointmentStatus,
      AppointmentUpdateRequest,
    } from '../../models/appointment.model';
    import { AppointmentService } from '../../services/appointment';

    @Component({
      selector: 'app-appointment-form',
      standalone: true,
      imports: [ReactiveFormsModule, RouterLink],
      templateUrl: './appointment-form.html',
      styleUrl: './appointment-form.css',
    })
    export class AppointmentForm implements OnInit {
      private fb = inject(FormBuilder);
      private appointmentService = inject(AppointmentService);
      private branchService = inject(BranchService);
      private veterinarianService = inject(VeterinarianService);
      private petService = inject(PetService);
      private authService = inject(AuthService);
      private router = inject(Router);
      private route = inject(ActivatedRoute);
      private formHeading =
      viewChild<ElementRef<HTMLElement>>('formHeading');

      readonly isClient = computed(() =>
      this.authService.hasRole('ROLE_CLIENT'));
      readonly isEditMode = signal<boolean>(false);
      readonly externalId = signal<string | null>(null);
      private readonly currentStatus = signal<AppointmentStatus>('PENDING');

      loading = signal<boolean>(false);
      saving = signal<boolean>(false);
      notFound = signal<boolean>(false);
      error = signal<string | null>(null);
      loadError = signal<string | null>(null);

      branches = signal<BranchResponse[]>([]);
      veterinarians = signal<VeterinarianResponse[]>([]);
      pets = signal<PetResponse[]>([]);

   
      availableSlots = signal<string[]>([]);
      loadingSlots = signal<boolean>(false);
      slotsError = signal<string | null>(null);

      appointmentForm: FormGroup = this.fb.group({
        branchExternalId: ['', [Validators.required]],
        veterinarianExternalId: ['', [Validators.required]],
        date: ['', [Validators.required]],
        time: ['', [Validators.required]],
        petExternalId: ['', [Validators.required]],
        durationMinutes: [
          30,
          [Validators.required, Validators.min(15),
          Validators.max(120)],
        ],
        reason: ['', [Validators.required, Validators.pattern(/\S/)]],
      });

      get minDate(): string {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('externalId');
        if (id) {
          this.isEditMode.set(true);
          this.externalId.set(id);
        }

        this.loadCatalogs();

        if (this.isEditMode() && id) {
          this.loadAppointment(id);
        }
      }

      loadCatalogs(): void {
        this.branchService.getAll().subscribe({
          next: (branches) => this.branches.set(branches),
          error: () => this.branches.set([]),
        });

        this.veterinarianService.getAll().subscribe({
          next: (vets) => this.veterinarians.set(vets),
          error: () => this.veterinarians.set([]),
        });

        const pets$ = this.isClient()
          ? this.petService.getMyPets()
          : this.petService.getAll();

        pets$.subscribe({
          next: (pets) => this.pets.set(pets),
          error: () => this.pets.set([]),
        });
      }

      loadAppointment(id: string): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.notFound.set(false);

        this.appointmentService.getById(id).subscribe({
          next: (appointment) => {
            this.patchForm(appointment);
            this.loading.set(false);
          },
          error: (err) => {
            this.loading.set(false);
            if (err?.status === 404) {
              this.notFound.set(true);
            } else {
              this.loadError.set('No pudimos cargar los datos delturno.');
            }
          },
        });
      }

      private patchForm(appointment: AppointmentResponse): void {
        const dateStr = appointment.appointmentDate ?? '';
        const [datePart, timePart] = dateStr.split('T');
        const timeFormatted = timePart ? timePart.slice(0, 5) : '';

        this.currentStatus.set(appointment.status ?? 'PENDING');

        this.appointmentForm.patchValue({
          branchExternalId: appointment.branch?.externalId ?? '',
          veterinarianExternalId: appointment.veterinarian?.externalId
          ?? '',
          date: datePart ?? '',
          time: timeFormatted,
          petExternalId: appointment.pet?.externalId ?? '',
          durationMinutes: appointment.durationMinutes ?? 30,
          reason: appointment.reason ?? '',
        });

        if (
          appointment.veterinarian?.externalId &&
          appointment.branch?.externalId &&
          datePart
        ) {
          this.fetchAvailableSlots(
            appointment.veterinarian.externalId,
            appointment.branch.externalId,
            datePart,
            timeFormatted,
          );
        }
      }

      
      onAvailabilityCriteriaChanged(): void {
        const branchId =
        this.appointmentForm.get('branchExternalId')?.value;
        const vetId =
        this.appointmentForm.get('veterinarianExternalId')?.value;
        const date = this.appointmentForm.get('date')?.value;

        if (!branchId || !vetId || !date) {
          this.availableSlots.set([]);
          this.appointmentForm.get('time')?.setValue('');
          return;
        }

        this.fetchAvailableSlots(vetId, branchId, date);
      }

      private fetchAvailableSlots(
        vetId: string,
        branchId: string,
        date: string,
        currentTimeToPreserve?: string,
      ): void {
        this.loadingSlots.set(true);
        this.slotsError.set(null);

        this.appointmentService.getAvailableSlots(vetId, branchId,
        date).subscribe({
          next: (slots) => {
            this.loadingSlots.set(false);
            const formattedSlots = slots.map((s) => s.slice(0, 5));

            if (
              currentTimeToPreserve &&
              !formattedSlots.includes(currentTimeToPreserve)
            ) {
              formattedSlots.unshift(currentTimeToPreserve);
            }

            this.availableSlots.set(formattedSlots);

            const currentSelectedTime =
            this.appointmentForm.get('time')?.value;
            if (
              currentSelectedTime &&
              !formattedSlots.includes(currentSelectedTime)
            ) {
              this.appointmentForm.get('time')?.setValue('');
            }
          },
          error: (err) => {
            this.loadingSlots.set(false);
            this.availableSlots.set([]);
            const message =
              typeof err?.error?.message === 'string'
                ? err.error.message.toLowerCase()
                : '';
            const ruleMessage = this.appointmentRuleMessage(message);

            if (ruleMessage) {
              this.slotsError.set(ruleMessage);
            } else if (
              err?.status === 400 ||
              err?.status === 409 ||
              err?.status === 422
            ) {
              this.slotsError.set(
                'El veterinario o la sucursal no están disponibles en la fecha seleccionada.',
              );
            } else {
              this.slotsError.set('No pudimos consultar los horarios disponibles.');
            }
          },
        });
      }

      selectSlot(slot: string): void {
        this.appointmentForm.get('time')?.setValue(slot);
        this.appointmentForm.get('time')?.markAsDirty();
      }

      onSubmit(): void {
        if (this.appointmentForm.invalid || this.saving()) {
          this.appointmentForm.markAllAsTouched();
          return;
        }

        const raw = this.appointmentForm.getRawValue();

        const timeFormatted =
          raw.time.length === 5 ? `${raw.time}:00` : raw.time;
        const appointmentDate = `${raw.date}T${timeFormatted}`;

        this.saving.set(true);
        this.error.set(null);

        if (this.isEditMode()) {
          const id = this.externalId()!;
          const updatePayload: AppointmentUpdateRequest = {
            appointmentDate,
            durationMinutes: Number(raw.durationMinutes),
            reason: raw.reason.trim(),
            status: this.currentStatus(),
            petExternalId: raw.petExternalId,
            veterinarianExternalId: raw.veterinarianExternalId,
            branchExternalId: raw.branchExternalId,
          };

          this.appointmentService.update(id, updatePayload).subscribe({
            next: () => {
              this.saving.set(false);
              this.router.navigate(['/appointments']);
            },
            error: (err) => this.handleSubmitError(err),
          });
        } else {
          const createPayload: AppointmentCreateRequest = {
            appointmentDate,
            durationMinutes: Number(raw.durationMinutes),
            reason: raw.reason.trim(),
            petExternalId: raw.petExternalId,
            veterinarianExternalId: raw.veterinarianExternalId,
            branchExternalId: raw.branchExternalId,
          };

          this.appointmentService.create(createPayload).subscribe({
            next: () => {
              this.saving.set(false);
              this.router.navigate(['/appointments']);
            },
            error: (err) => this.handleSubmitError(err),
          });
        }
      }

      private handleSubmitError(err: any): void {
        this.saving.set(false);
        const status = err?.status;
        const message =
          typeof err?.error?.message === 'string'
            ? err.error.message.toLowerCase()
            : '';

        if (status === 401) {
          this.error.set('Tu sesión expiró. Iniciá sesión nuevamente.');
        } else if (status === 403) {
          this.error.set('No tenés permisos para realizar esta acción.');
        } else if (status === 409) {
          const ruleMessage = this.appointmentRuleMessage(message);

          if (ruleMessage) {
            this.error.set(ruleMessage);

            if (message.includes('status cannot be changed')) {
              this.reloadAppointmentAfterConflict();
            }
          } else {
            this.error.set(
              'El turno entra en conflicto con otro existente. Revisá el horario.',
            );
          }
        } else if (status === 400) {
          const ruleMessage = this.appointmentRuleMessage(message);

          this.error.set(
            ruleMessage ??
              'Datos inválidos. Revisá los campos e intentá nuevamente.',
          );
        } else {
          this.error.set('Ocurrió un error al guardar el turno. Intentá nuevamente.');
        }
      }

      private appointmentRuleMessage(message: string): string | null {
        if (message.includes('status cannot be changed')) {
          return 'El turno cambió de estado. Actualizamos los datos para que puedas revisarlo e intentar nuevamente.';
        }

        if (message.includes('use delete endpoint to cancel')) {
          return 'Para cancelar el turno usá la acción Cancelar del listado.';
        }

        if (message.includes('completed via visit')) {
          return 'El turno solo puede completarse desde una visita.';
        }

        if (message.includes('overlap')) {
          return 'El veterinario o la mascota ya tienen un turno en ese horario.';
        }

        if (message.includes('past')) {
          return 'No se pueden programar turnos en el pasado.';
        }

        if (message.includes('closed')) {
          return 'La sucursal está cerrada en el horario seleccionado.';
        }

        if (message.includes('does not have working hours')) {
          return 'El veterinario no tiene horario laboral configurado.';
        }

        if (message.includes('working hours')) {
          return 'El horario está fuera del rango laboral del veterinario.';
        }

        if (message.includes('hour or half hour')) {
          return 'El turno debe comenzar en punto o a la media hora.';
        }

        return null;
      }

      private reloadAppointmentAfterConflict(): void {
        const id = this.externalId();

        if (this.isEditMode() && id) {
          this.loadAppointment(id);
        }
      }

      petLabel(pet: PetResponse): string {
        const details = [pet.animalType?.name, pet.breed?.name]
          .filter(Boolean)
          .join(' - ');
        return details ? `${pet.name} (${details})` : pet.name;
      }

      veterinarianLabel(vet: VeterinarianResponse): string {
        const name = `${vet.firstName} ${vet.lastName}`.trim();
         return name;
      }
    }

