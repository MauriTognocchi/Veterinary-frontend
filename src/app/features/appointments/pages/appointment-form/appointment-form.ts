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
        status: ['PENDING'],
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

        this.appointmentForm.patchValue({
          branchExternalId: appointment.branch?.externalId ?? '',
          veterinarianExternalId: appointment.veterinarian?.externalId
          ?? '',
          date: datePart ?? '',
          time: timeFormatted,
          petExternalId: appointment.pet?.externalId ?? '',
          durationMinutes: appointment.durationMinutes ?? 30,
          reason: appointment.reason ?? '',
          status: appointment.status ?? 'PENDING',
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
            if (err?.status === 400 || err?.status === 422) {
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
            status: raw.status as AppointmentStatus,
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
        const message = err?.error?.message;

        if (status === 409 || message?.includes('overlapping')) {
          this.error.set(
            'El veterinario o la mascota ya tienen un turno en ese horario.',
          );
        } else if (status === 400 && message?.includes('past')) {
          this.error.set('No se pueden programar turnos en el pasado.');
        } else if (status === 400 && message?.includes('closed')) {
          this.error.set('La sucursal está cerrada en el horario seleccionado.');
        } else if (status === 400 && message?.includes('working hours')) {
          this.error.set(
            'El horario está fuera del rango laboral del veterinario.',
          );
        } else if (status === 403) {
          this.error.set('No tenés permisos para realizar esta acción.');
        } else {
          this.error.set('Ocurrió un error al guardar el turno. Intentá nuevamente.');
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
        return vet.licenseNumber ? `${name} (${vet.licenseNumber})` :
        name;
      }
    }

