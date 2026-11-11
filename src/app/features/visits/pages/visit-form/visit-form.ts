import { Component, inject, signal, OnInit } from '@angular/core';
    import { ActivatedRoute, Router, RouterLink } from '@angular/router';
    import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
    import { VisitService } from '../../services/visit';
    import { VeterinarianService } from '../../../veterinarians/services/veterinarian';
    import { AppointmentService } from '../../../appointments/services/appointment';
    import { PetService } from '../../../pets/services/pet';
    import { VeterinarianResponse } from '../../../veterinarians/models/veterinarian.model';
    import { AppointmentResponse } from '../../../appointments/models/appointment.model';
    import { PetResponse } from '../../../pets/models/pet.model';
    import { VisitResponse } from '../../models/visit.model';

    type FormMode = 'scheduled' | 'walkin' | 'edit';

    @Component({
      selector: 'app-visit-form',
      standalone: true,
      imports: [RouterLink, ReactiveFormsModule],
      templateUrl: './visit-form.html',
      styleUrl: './visit-form.css',
    })
    export class VisitForm implements OnInit {
      private readonly route = inject(ActivatedRoute);
      private readonly router = inject(Router);
      private readonly fb = inject(FormBuilder);
      private readonly visitService = inject(VisitService);
      private readonly veterinarianService = inject(VeterinarianService);
      private readonly appointmentService = inject(AppointmentService);
      private readonly petService = inject(PetService);

      mode = signal<FormMode>('scheduled');
      existingVisit = signal<VisitResponse | null>(null);

      veterinarians = signal<VeterinarianResponse[]>([]);
      appointments = signal<AppointmentResponse[]>([]);
      pets = signal<PetResponse[]>([]);

      loadingData = signal(false);
      submitting = signal(false);
      error = signal<string | null>(null);

      form!: FormGroup;

      get title(): string {
        switch (this.mode()) {
          case 'scheduled': return 'Nueva visita programada';
          case 'walkin': return 'Nueva visita walk-in';
          case 'edit': return 'Editar visita';
        }
      }

      get isEdit(): boolean { return this.mode() === 'edit'; }
      get isScheduled(): boolean { return this.mode() === 'scheduled'; }
      get isWalkIn(): boolean { return this.mode() === 'walkin'; }

      ngOnInit(): void {
        this.detectMode();
        this.buildForm();
        this.loadSupportingData();
      }

      private detectMode(): void {
        const url = this.router.url;
        const externalId = this.route.snapshot.paramMap.get('externalId');

        if (externalId) {
          this.mode.set('edit');
        } else if (url.includes('walk-in')) {
          this.mode.set('walkin');
        } else {
          this.mode.set('scheduled');
        }
      }

      private buildForm(): void {
        this.form = this.fb.group({
          observations: ['', Validators.required],
          veterinarianExternalId: ['', Validators.required],
          appointmentExternalId: [''],
          petExternalId: [''],
        });

        if (this.isScheduled) {
          this.form.get('appointmentExternalId')!.setValidators(Validators.required);
        }
        if (this.isWalkIn) {
          this.form.get('petExternalId')!.setValidators(Validators.required);
        }
      }

      private loadSupportingData(): void {
        this.loadingData.set(true);
        this.error.set(null);

        this.veterinarianService.getAll({}).subscribe({
          next: (vets) => this.veterinarians.set(vets),
          error: () => this.error.set('Error al cargar veterinarios.'),
        });

        if (this.isScheduled) {
          this.appointmentService.getAll({ status: 'CONFIRMED' }).subscribe({
            next: (appts) => {
              this.appointments.set(appts);
              this.loadingData.set(false);
            },
            error: () => {
              this.error.set('Error al cargar turnos confirmados.');
              this.loadingData.set(false);
            },
          });
        } else if (this.isWalkIn) {
          this.petService.getAll().subscribe({
            next: (pets) => {
              this.pets.set(pets);
              this.loadingData.set(false);
            },
            error: () => {
              this.error.set('Error al cargar mascotas.');
              this.loadingData.set(false);
            },
          });
        } else if (this.isEdit) {
          const externalId = this.route.snapshot.paramMap.get('externalId')!;
          this.visitService.getById(externalId).subscribe({
            next: (visit) => {
              this.existingVisit.set(visit);
              this.form.patchValue({
                observations: visit.observations,
                veterinarianExternalId: visit.veterinarian.externalId,
              });
              this.loadingData.set(false);
            },
            error: () => {
              this.error.set('Error al cargar la visita.');
              this.loadingData.set(false);
            },
          });
        }
      }

      onSubmit(): void {
        if (this.form.invalid) {
          this.form.markAllAsTouched();
          return;
        }

        this.submitting.set(true);
        this.error.set(null);

        const { observations, veterinarianExternalId, appointmentExternalId, petExternalId } =
          this.form.value;

        if (this.isScheduled) {
          this.visitService.create({ observations, appointmentExternalId, veterinarianExternalId }).subscribe({
            next: (v) => this.router.navigate(['/visits', v.externalId]),
            error: () => {
              this.error.set('Error al registrar la visita.');
              this.submitting.set(false);
            },
          });
        } else if (this.isWalkIn) {
          this.visitService.createWalkIn({ observations, petExternalId, veterinarianExternalId }).subscribe({
            next: (v) => this.router.navigate(['/visits', v.externalId]),
            error: () => {
              this.error.set('Error al registrar la visita walk-in.');
              this.submitting.set(false);
            },
          });
        } else {
          const externalId = this.route.snapshot.paramMap.get('externalId')!;
          this.visitService.update(externalId, { observations, veterinarianExternalId }).subscribe({
            next: (v) => this.router.navigate(['/visits', v.externalId]),
            error: () => {
              this.error.set('Error al actualizar la visita.');
              this.submitting.set(false);
            },
          });
        }
      }

      formatAppointmentLabel(appt: AppointmentResponse): string {
        const date = new Date(appt.appointmentDate).toLocaleString('es-AR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });
        return `${appt.pet?.name ?? 'Mascota'} — ${date} — ${appt.reason}`;
      }

      isInvalid(field: string): boolean {
        const ctrl = this.form.get(field);
        return !!(ctrl?.invalid && ctrl?.touched);
      }
    }