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
import { StudyRequest } from '../../models/study.model';
import { StudyService } from '../../services/study';

@Component({
  selector: 'app-study-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './study-form.html',
  styleUrl: './study-form.css',
})
export class StudyForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly studyService = inject(StudyService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly formHeading = viewChild<ElementRef<HTMLElement>>('formHeading');

  readonly editando = signal<boolean>(false);
  readonly externalId = signal<string | null>(null);
  readonly saving = signal<boolean>(false);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly loadErrorRetryable = signal<boolean>(false);
  readonly notFound = signal<boolean>(false);

  readonly studyForm: FormGroup = this.fb.group({
    name: [
      '',
      [
        Validators.required,
        Validators.pattern(/\S/),
        Validators.maxLength(100),
      ],
    ],
    description: ['', [Validators.maxLength(255)]],
  });

  ngOnInit(): void {
    const externalId = this.route.snapshot.paramMap.get('externalId');
    if (externalId) {
      this.externalId.set(externalId);
      this.editando.set(true);
      this.loadStudy(externalId);
    }
  }

  loadStudy(externalId: string): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.loadErrorRetryable.set(false);
    this.notFound.set(false);

    this.studyService.getById(externalId).subscribe({
      next: (study) => {
        this.studyForm.patchValue({
          name: study.name,
          description: study.description ?? '',
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
          this.loadError.set(
            'Sesión expirada. Por favor iniciá sesión nuevamente.',
          );
        } else if (status === 403) {
          this.loadError.set('No tenés permisos para ver este estudio.');
        } else {
          this.loadError.set('No se pudo cargar el estudio.');
        }
      },
    });
  }

  retryLoad(): void {
    const id = this.externalId();
    if (id) {
      this.loadStudy(id);
      this.formHeading()?.nativeElement.focus();
    }
  }

  onSubmit(): void {
    if (this.studyForm.invalid || this.saving()) {
      this.studyForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

     const payload: StudyRequest = {
      name: this.studyForm.value.name.trim(),
      description: (this.studyForm.value.description ?? '').trim() || undefined,
    };

    const request$ = this.editando()
      ? this.studyService.update(this.externalId()!, payload)
      : this.studyService.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/studies']);
      },
      error: (err) => {
        this.saving.set(false);
        const status = err?.status;

        if (status === 400) {
          this.error.set('Revisá los datos ingresados e intentá nuevamente.');
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