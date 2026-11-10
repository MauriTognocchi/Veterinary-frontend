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
    import { ConditionRequest } from '../../models/condition.model';
    import { ConditionService } from '../../services/condition';
    
    @Component({
      selector: 'app-condition-form',
      standalone: true,
      imports: [ReactiveFormsModule, RouterLink],
      templateUrl: './condition-form.html',
      styleUrl: './condition-form.css',
    })
    export class ConditionForm implements OnInit {
      private fb = inject(FormBuilder);
      private conditionService = inject(ConditionService);
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
    
      conditionForm: FormGroup = this.fb.group({
        name: [
          '',
          [
            Validators.required,
            Validators.pattern(/\S/),
            Validators.maxLength(50),
          ],
        ],
        description: [
          '',
          [
            Validators.required,
            Validators.pattern(/\S/),
            Validators.maxLength(255),
          ],
        ],
      });
    
      ngOnInit(): void {
        const externalId = this.route.snapshot.paramMap.get('externalId');
        if (externalId) {
          this.externalId.set(externalId);
          this.editando.set(true);
          this.loadCondition(externalId);
        }
      }
    
      loadCondition(externalId: string): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.loadErrorRetryable.set(false);
        this.notFound.set(false);
    
        this.conditionService.getById(externalId).subscribe({
          next: (condition) => {
            this.conditionForm.patchValue({
              name: condition.name,
              description: condition.description,
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
              this.loadError.set('No tenés permisos para ver esta condición médica.');
            } else {
              this.loadError.set('No se pudo cargar la condición médica.');
            }
          },
        });
      }
    
      retryLoad(): void {
        const id = this.externalId();
        if (id) {
          this.loadCondition(id);
          this.formHeading()?.nativeElement.focus();
        }
      }
    
      onSubmit(): void {
        if (this.conditionForm.invalid || this.saving()) {
          this.conditionForm.markAllAsTouched();
          return;
        }
    
        this.saving.set(true);
        this.error.set(null);
    
        const payload: ConditionRequest = {
          name: this.conditionForm.value.name.trim(),
          description: this.conditionForm.value.description.trim(),
        };
    
        const request$ = this.editando()
          ? this.conditionService.update(this.externalId()!, payload)
          : this.conditionService.create(payload);
    
        request$.subscribe({
          next: () => {
            this.saving.set(false);
            this.router.navigate(['/conditions']);
          },
          error: (err) => {
            this.saving.set(false);
            const status = err?.status;
    
            if (status === 409) {
              this.error.set('Ya existe una condición médica con ese nombre.');
            } else if (status === 403) {
              this.error.set('No tenés permisos para realizar esta acción.');
            } else {
              this.error.set(
                'Ocurrió un error al guardar los datos. Verificá los campos e intentá nuevamente.',
              );
            }
          },
        });
      }
    }