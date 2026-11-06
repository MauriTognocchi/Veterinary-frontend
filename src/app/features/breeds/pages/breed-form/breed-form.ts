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
    import { BreedRequest } from '../../models/breed.model';
    import { BreedService } from '../../services/breed';
    
    @Component({
      selector: 'app-breed-form',
      standalone: true,
      imports: [ReactiveFormsModule, RouterLink],
      templateUrl: './breed-form.html',
      styleUrl: './breed-form.css',
    })
    export class BreedForm implements OnInit {
      private fb = inject(FormBuilder);
      private breedService = inject(BreedService);
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
    
      breedForm: FormGroup = this.fb.group({
        name: [
          '',
          [
            Validators.required,
            Validators.pattern(/\S/),
            Validators.maxLength(50),
          ],
        ],
      });
    
      ngOnInit(): void {
        const externalId = this.route.snapshot.paramMap.get('externalId');
    
        if (externalId) {
          this.externalId.set(externalId);
          this.editando.set(true);
          this.loadBreed(externalId);
        }
      }
    
      loadBreed(externalId: string): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.loadErrorRetryable.set(false);
        this.notFound.set(false);
    
        this.breedService.getById(externalId).subscribe({
          next: (breed) => {
            this.breedForm.patchValue({ name: breed.name });
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
              this.loadError.set(
                'No tenés autorización para editar esta raza. Iniciá sesión nuevamente.',
              );
            } else if (status === 403) {
              this.loadError.set('No tenés permisos para editar esta raza.');
            } else if (status === 0) {
              this.loadError.set(
                'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
              );
            } else if (status >= 500 || status === 408 || status === 429) {
              this.loadError.set(
                'No pudimos cargar los datos de la raza. Intentá nuevamente en unos minutos.',
              );
            } else {
              this.loadError.set('No pudimos cargar los datos de la raza.');
            }
          },
        });
      }
    
      retryLoad(): void {
        const externalId = this.externalId();
    
        if (externalId) {
          this.loadBreed(externalId);
          this.formHeading()?.nativeElement.focus();
        }
      }
    
      onSubmit(): void {
        if (this.breedForm.invalid || this.saving()) {
          this.breedForm.markAllAsTouched();
          return;
        }
    
        this.saving.set(true);
        this.error.set(null);
        this.breedForm.disable();
    
        const raw = this.breedForm.getRawValue() as { name: string };
        const breed: BreedRequest = {
          name: raw.name.trim(),
        };
    
        const externalId = this.externalId();
        const isEditing = this.editando() && externalId !== null;
    
        const request$ = isEditing
          ? this.breedService.update(externalId, breed)
          : this.breedService.create(breed);
    
        request$.subscribe({
          next: () => {
            this.saving.set(false);
            this.router.navigate(['/breeds']);
          },
          error: (err) => {
            this.saving.set(false);
            this.breedForm.enable();
    
            const action = isEditing ? 'actualizar' : 'crear';
    
            if (err?.status === 404) {
              this.error.set('La raza ya no existe.');
            } else if (err?.status === 400) {
              this.error.set('Datos inválidos. Revisá el campo.');
            } else if (err?.status === 401) {
              this.error.set(
                'Tu sesión no está autorizada. Iniciá sesión nuevamente.',
              );
            } else if (err?.status === 403) {
              this.error.set(`No tenés permisos para ${action} razas.`);
            } else if (err?.status === 0) {
              this.error.set(
                'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
              );
            } else if (
              err?.status >= 500 ||
              err?.status === 408 ||
              err?.status === 429
            ) {
              this.error.set(
                `No pudimos ${action} la raza. Intentá nuevamente en unos minutos.`,
              );
            } else {
              this.error.set(`No pudimos ${action} la raza. Intentá nuevamente.`);
            }
          },
        });
      }
    }