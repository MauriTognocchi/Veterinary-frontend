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
import { AnimalTypeRequest } from '../../models/animal-type.model';
import { AnimalTypeService } from '../../services/animal-type';

@Component({
  selector: 'app-animal-type-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './animal-type-form.html',
  styleUrl: './animal-type-form.css',
})
export class AnimalTypeForm implements OnInit {
  private fb = inject(FormBuilder);
  private animalTypeService = inject(AnimalTypeService);
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

  animalTypeForm: FormGroup = this.fb.group({
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
      this.loadAnimalType(externalId);
    }
  }

  loadAnimalType(externalId: string): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.loadErrorRetryable.set(false);
    this.notFound.set(false);

    this.animalTypeService.getById(externalId).subscribe({
      next: (animalType) => {
        this.animalTypeForm.patchValue({ name: animalType.name });
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
            'No tenés autorización para editar este tipo de animal. Iniciá sesión nuevamente.',
          );
        } else if (status === 403) {
          this.loadError.set(
            'No tenés permisos para editar este tipo de animal.',
          );
        } else if (status === 0) {
          this.loadError.set(
            'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
          );
        } else if (status >= 500 || status === 408 || status === 429) {
          this.loadError.set(
            'No pudimos cargar los datos del tipo de animal. Intentá nuevamente en unos minutos.',
          );
        } else {
          this.loadError.set(
            'No pudimos cargar los datos del tipo de animal.',
          );
        }
      },
    });
  }

  retryLoad(): void {
    const externalId = this.externalId();

    if (externalId) {
      this.loadAnimalType(externalId);
      this.formHeading()?.nativeElement.focus();
    }
  }

  onSubmit(): void {
    if (this.animalTypeForm.invalid || this.saving()) {
      this.animalTypeForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.animalTypeForm.disable();

    const raw = this.animalTypeForm.getRawValue() as { name: string };
    const animalType: AnimalTypeRequest = {
      name: raw.name.trim(),
    };

    const externalId = this.externalId();
    const isEditing = this.editando() && externalId !== null;

    const request$ = isEditing
      ? this.animalTypeService.update(externalId, animalType)
      : this.animalTypeService.create(animalType);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/animal-types']);
      },
      error: (err) => {
        this.saving.set(false);
        this.animalTypeForm.enable();

        const action = isEditing ? 'actualizar' : 'crear';

        if (err?.status === 404) {
          this.error.set('El tipo de animal ya no existe.');
        } else if (err?.status === 400) {
          this.error.set('Datos inválidos. Revisá el campo.');
        } else if (err?.status === 401) {
          this.error.set(
            'Tu sesión no está autorizada. Iniciá sesión nuevamente.',
          );
        } else if (err?.status === 403) {
          this.error.set(
            `No tenés permisos para ${action} tipos de animales.`,
          );
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
            `No pudimos ${action} el tipo de animal. Intentá nuevamente en unos minutos.`,
          );
        } else {
          this.error.set(
            `No pudimos ${action} el tipo de animal. Intentá nuevamente.`,
          );
        }
      },
    });
  }
}
