import {
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth';
import { StudyResponse } from '../../models/study.model';
import { StudyService } from '../../services/study';

@Component({
  selector: 'app-study-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './study-list.html',
  styleUrl: './study-list.css',
})
export class StudyList implements OnInit {
  private readonly studyService = inject(StudyService);
  private readonly authService = inject(AuthService);
  private readonly listHeading = viewChild<ElementRef<HTMLElement>>('listHeading');

  
  readonly canCreate = computed(() =>
    this.authService.hasAnyRole(['ROLE_VETERINARIAN']),
  );
  
  readonly canEdit = computed(() =>
    this.authService.hasAnyPermission(['UPDATE_CLINICAL_RECORDS']),
  );
  
  readonly canDelete = computed(() =>
    this.authService.hasAnyRole(['ROLE_ADMIN']),
  );

  readonly studies = signal<StudyResponse[]>([]);
  readonly search = signal<string>('');
  readonly filteredStudies = computed<StudyResponse[]>(() => {
    const term = this.search().trim().toLowerCase();

    if (!term) {
      return this.studies();
    }

    return this.studies().filter(
      (study) =>
        study.name.toLowerCase().includes(term) ||
        (study.description ?? '').toLowerCase().includes(term),
    );
  });

  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly loadErrorRetryable = signal<boolean>(false);
  readonly deletingId = signal<string | null>(null);
  readonly deleteError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadStudies();
  }

  loadStudies(): void {
    this.loading.set(true);
    this.error.set(null);
    this.loadErrorRetryable.set(false);
    this.studies.set([]);

    this.studyService.getAll().subscribe({
      next: (studies) => {
        this.studies.set(
          [...studies].sort((a, b) => a.name.localeCompare(b.name, 'es')),
        );
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const status = err?.status;
        this.loadErrorRetryable.set(
          status === 0 || status === 408 || status === 429 || status >= 500,
        );

        if (status === 401) {
          this.error.set(
            'No tenés autorización para ver los estudios. Iniciá sesión nuevamente.',
          );
        } else if (status === 403) {
          this.error.set('No tenés permisos para ver los estudios.');
        } else if (status === 0) {
          this.error.set(
            'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
          );
        } else {
          this.error.set('No pudimos cargar los estudios.');
        }
      },
    });
  }

  retryLoad(): void {
    this.loadStudies();
    this.listHeading()?.nativeElement.focus();
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.search.set(target.value);
  }

  clearSearch(): void {
    this.search.set('');
  }
  

  

  deleteStudy(study: StudyResponse): void {
    if (this.deletingId() !== null) {
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar el estudio "${study.name}"? Esta acción no se puede deshacer.`,
    );

    if (!confirmed) {
      return;
    }

    this.deletingId.set(study.externalId);
    this.deleteError.set(null);

    this.studyService.delete(study.externalId).subscribe({
      next: () => {
        this.studies.update((items) =>
          items.filter((item) => item.externalId !== study.externalId),
        );
        this.deletingId.set(null);
      },
      error: (err) => {
        this.deletingId.set(null);
        const status = err?.status;

        if (status === 403) {
          this.deleteError.set(
            'Solo los administradores pueden eliminar estudios.',
          );
        } else if (status === 409 || status >= 500) {
          this.deleteError.set(
            'No se pudo eliminar el estudio. Puede estar asociado a visitas existentes.',
          );
        } else {
          this.deleteError.set(
            'Ocurrió un error al intentar eliminar el estudio.',
          );
        }
      },
    });
  }
}