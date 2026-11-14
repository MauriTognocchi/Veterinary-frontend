import {
      Component,
      ElementRef,
      OnInit,
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
    import { ActivatedRoute, Router, RouterLink } from '@angular/router';
    import { MedicationRequest } from '../../models/medication.model';
    import { MedicationService } from '../../services/medication';
    
    @Component({
      selector: 'app-medication-form',
      standalone: true,
      imports: [ReactiveFormsModule, RouterLink],
      templateUrl: './medication-form.html',
      styleUrl: './medication-form.css',
    })
    export class MedicationForm implements OnInit {
      private fb = inject(FormBuilder);
      private medicationService = inject(MedicationService);
      private router = inject(Router);
      private route = inject(ActivatedRoute);
      private formHeading = viewChild<ElementRef<HTMLElement>>('formHeading');
    
      editando = signal<boolean>(false);
      externalId = signal<string | null>(null);
      saving = signal<boolean>(false);
      loading = signal<boolean>(false);
      error = signal<string | null>(null);
      loadError = signal<string | null>(null);
      loadErrorRetryable = signal<boolean>(false);
      notFound = signal<boolean>(false);
    
      medicationForm: FormGroup = this.fb.group({
        name: [
          '',
          [
            Validators.required,
            Validators.pattern(/\S/),
            Validators.maxLength(100),
          ],
        ],
        dosage: [
          '',
          [
            Validators.required,
            Validators.min(0.01),
          ],
        ],
        dosageUnit: [
          '',
          [
            Validators.required,
            Validators.pattern(/\S/),
            Validators.maxLength(30),
          ],
        ],
      });
    
      ngOnInit(): void {
        const externalId = this.route.snapshot.paramMap.get('externalId');
        if (externalId) {
          this.externalId.set(externalId);
          this.editando.set(true);
          this.loadMedication(externalId);
        }
      }
    
      loadMedication(externalId: string): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.loadErrorRetryable.set(false);
        this.notFound.set(false);
    
        this.medicationService.getById(externalId).subscribe({
          next: (medication) => {
            this.medicationForm.patchValue({
              name: medication.name,
              dosage: medication.dosage,
              dosageUnit: medication.dosageUnit,
            });
            this.loading.set(false);
          },
          error: (err) => {
            this.loading.set(false);
            const status = err?.status;
            const retryable =
              status === 0 || status === 408 || status === 429 || status >= 500;
            this.loadErrorRetryable.set(retryable);
    
            if (status === 404) {
              this.notFound.set(true);
            } else if (status === 401) {
              this.loadError.set('Sesión expirada. Por favor iniciá sesión nuevamente.');
            } else if (status === 403) {
              this.loadError.set('No tenés permisos para ver este medicamento.');
            } else {
              this.loadError.set('No se pudo cargar el medicamento.');
            }
          },
        });
      }
    
      retryLoad(): void {
        const id = this.externalId();
        if (id) {
          this.loadMedication(id);
          this.formHeading()?.nativeElement.focus();
        }
      }
    
      onSubmit(): void {
        if (this.medicationForm.invalid || this.saving()) {
          this.medicationForm.markAllAsTouched();
          return;
        }
    
        this.saving.set(true);
        this.error.set(null);
    
        const payload: MedicationRequest = {
          name: this.medicationForm.value.name.trim(),
          dosage: Number(this.medicationForm.value.dosage),
          dosageUnit: this.medicationForm.value.dosageUnit.trim(),
        };
    
        const request$ = this.editando()
          ? this.medicationService.update(this.externalId()!, payload)
          : this.medicationService.create(payload);
    
        request$.subscribe({
          next: () => {
            this.saving.set(false);
            this.router.navigate(['/medications']);
          },
          error: (err) => {
            this.saving.set(false);
            const status = err?.status;
    
            if (status === 409) {
              this.error.set('Ya existe un medicamento registrado con ese nombre.');
            } else if (status === 403) {
              this.error.set('Solo los administradores pueden gestionar medicamentos.');
            } else {
              this.error.set(
                'Ocurrió un error al guardar los datos. Verificá los campos e intentá nuevamente.',
              );
            }
          },
        });
      }
    }
