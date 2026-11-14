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
    import { BREED_ADMIN_ROLES } from '../../../../core/models/auth.model';
    import { AuthService } from '../../../../core/services/auth';
    import { BreedResponse } from '../../models/breed.model';
    import { BreedService } from '../../services/breed';
    
    @Component({
      standalone: true,
      imports: [RouterLink],
      selector: 'app-breed-list',
      styleUrl: './breed-list.css',
      templateUrl: './breed-list.html',
    })
    export class BreedList implements OnInit {
      private breedService = inject(BreedService);
      private authService = inject(AuthService);
      private listHeading = viewChild<ElementRef<HTMLElement>>('listHeading');
    
      readonly isAdmin = computed(() =>
        this.authService.hasAnyRole(BREED_ADMIN_ROLES),
      );
    
      breeds = signal<BreedResponse[]>([]);
      loading = signal<boolean>(true);
      error = signal<string | null>(null);
      loadErrorRetryable = signal<boolean>(false);
      deletingId = signal<string | null>(null);
      deleteError = signal<string | null>(null);
    
      ngOnInit(): void {
        this.loadBreeds();
      }
    
      loadBreeds(): void {
        this.loading.set(true);
        this.error.set(null);
        this.loadErrorRetryable.set(false);
        this.breeds.set([]);
    
        this.breedService.getAll().subscribe({
          next: (breeds) => {
            this.breeds.set(breeds);
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
                'No tenés autorización para ver las razas. Iniciá sesión nuevamente.',
              );
            } else if (status === 403) {
              this.error.set('No tenés permisos para ver las razas.');
            } else if (status === 404) {
              this.error.set('No encontramos la información solicitada.');
            } else if (status === 0) {
              this.error.set(
                'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
              );
            } else if (status >= 500 || status === 408 || status === 429) {
              this.error.set(
                'No pudimos cargar las razas. Intentá nuevamente en unos minutos.',
              );
            } else {
              this.error.set('No pudimos cargar las razas.');
            }
          },
        });
      }
    
      retryLoad(): void {
        this.loadBreeds();
        this.listHeading()?.nativeElement.focus();
      }
    
      deleteBreed(breed: BreedResponse): void {
        if (this.deletingId() !== null) {
          return;
        }
    
        const confirmed = window.confirm(
          `¿Eliminar la raza "${breed.name}"? Esta acción no se puede deshacer.`,
        );
    
        if (!confirmed) {
          return;
        }
    
        this.deletingId.set(breed.externalId);
        this.deleteError.set(null);
    
        this.breedService.delete(breed.externalId).subscribe({
          next: () => {
            this.breeds.update((breeds) =>
              breeds.filter((item) => item.externalId !== breed.externalId),
            );
            this.deletingId.set(null);
          },
          error: (err) => {
            this.deletingId.set(null);
    
            if (err?.status === 404) {
              this.deleteError.set('La raza ya no existe.');
            } else if (err?.status === 401) {
              this.deleteError.set(
                'No tenés autorización para eliminar razas. Iniciá sesión nuevamente.',
              );
            } else if (err?.status === 403) {
              this.deleteError.set('No tenés permisos para eliminar razas.');
            } else {
              this.deleteError.set(
                'No pudimos eliminar la raza. Intentá nuevamente.',
              );
            }
          },
        });
      }
    }