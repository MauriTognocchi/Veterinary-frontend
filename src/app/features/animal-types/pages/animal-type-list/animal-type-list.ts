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
import { ANIMAL_TYPE_ADMIN_ROLES } from '../../../../core/models/auth.model';
import { AuthService } from '../../../../core/services/auth';
import { AnimalTypeResponse } from '../../models/animal-type.model';
import { AnimalTypeService } from '../../services/animal-type';

@Component({
  standalone: true,
  imports: [RouterLink],
  selector: 'app-animal-type-list',
  styleUrl: './animal-type-list.css',
  templateUrl: './animal-type-list.html',
})
export class AnimalTypeList implements OnInit {
  private animalTypeService = inject(AnimalTypeService);
  private authService = inject(AuthService);
  private listHeading = viewChild<ElementRef<HTMLElement>>('listHeading');

  readonly isAdmin = computed(() =>
    this.authService.hasAnyRole(ANIMAL_TYPE_ADMIN_ROLES),
  );

  animalTypes = signal<AnimalTypeResponse[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  loadErrorRetryable = signal<boolean>(false);
  deletingId = signal<string | null>(null);
  deleteError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadAnimalTypes();
  }

  loadAnimalTypes(): void {
    this.loading.set(true);
    this.error.set(null);
    this.loadErrorRetryable.set(false);
    this.animalTypes.set([]);

    this.animalTypeService.getAll().subscribe({
      next: (animalTypes) => {
        this.animalTypes.set(animalTypes);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);

        const status = err?.status;
        const retryable =
          status === 0 || status === 408 || status === 429 || status >= 500;
        this.loadErrorRetryable.set(retryable);

        if (status === 401) {
          this.error.set(
            'No tenés autorización para ver los tipos de animales. Iniciá sesión nuevamente.',
          );
        } else if (status === 403) {
          this.error.set('No tenés permisos para ver los tipos de animales.');
        } else if (status === 404) {
          this.error.set('No encontramos la información solicitada.');
        } else if (status === 0) {
          this.error.set(
            'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
          );
        } else if (status >= 500 || status === 408 || status === 429) {
          this.error.set(
            'No pudimos cargar los tipos de animales. Intentá nuevamente en unos minutos.',
          );
        } else {
          this.error.set('No pudimos cargar los tipos de animales.');
        }
      },
    });
  }

  retryLoad(): void {
    this.loadAnimalTypes();
    this.listHeading()?.nativeElement.focus();
  }

  deleteAnimalType(animalType: AnimalTypeResponse): void {
    if (this.deletingId() !== null) {
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar el tipo de animal "${animalType.name}"? Esta acción no se puede deshacer.`,
    );

    if (!confirmed) {
      return;
    }

    this.deletingId.set(animalType.externalId);
    this.deleteError.set(null);

    this.animalTypeService.delete(animalType.externalId).subscribe({
      next: () => {
        this.animalTypes.update((animalTypes) =>
          animalTypes.filter(
            (item) => item.externalId !== animalType.externalId,
          ),
        );
        this.deletingId.set(null);
      },
      error: (err) => {
        this.deletingId.set(null);

        if (err?.status === 404) {
          this.deleteError.set('El tipo de animal ya no existe.');
        } else if (err?.status === 401) {
          this.deleteError.set(
            'No tenés autorización para eliminar tipos de animales. Iniciá sesión nuevamente.',
          );
        } else if (err?.status === 403) {
          this.deleteError.set(
            'No tenés permisos para eliminar tipos de animales.',
          );
        } else {
          this.deleteError.set(
            'No pudimos eliminar el tipo de animal. Intentá nuevamente.',
          );
        }
      },
    });
  }
}
