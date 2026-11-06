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
    import { PET_WRITE_ROLES } from '../../../../core/models/auth.model';
    import { AuthService } from '../../../../core/services/auth';
    import { PetResponse } from '../../models/pet.model';
    import { PetService } from '../../services/pet';

    @Component({
      standalone: true,
      imports: [RouterLink],
      selector: 'app-pet-list',
      styleUrl: './pet-list.css',
      templateUrl: './pet-list.html',
    })
    export class PetList implements OnInit {
      private petService = inject(PetService);
      private authService = inject(AuthService);
      private listHeading = viewChild<ElementRef<HTMLElement>>('listHeading');

      readonly canWrite = computed(() =>
        this.authService.hasAnyRole(PET_WRITE_ROLES),
      );

      pets = signal<PetResponse[]>([]);
      loading = signal<boolean>(true);
      error = signal<string | null>(null);
      loadErrorRetryable = signal<boolean>(false);
      deletingId = signal<string | null>(null);
      deleteError = signal<string | null>(null);

      ngOnInit(): void {
        this.loadPets();
      }

      loadPets(): void {
        this.loading.set(true);
        this.error.set(null);
        this.loadErrorRetryable.set(false);
        this.pets.set([]);

        // Si es un cliente (dueño), consulta sus mascotas. Si es admin/vet/recepcionista, consulta todas.
        const isClient = this.authService.hasRole('ROLE_CLIENT');
        const request$ = isClient
          ? this.petService.getMyPets()
          : this.petService.getAll();

        request$.subscribe({
          next: (pets) => {
            this.pets.set(pets.filter((p) => p.active !== false));
            this.loading.set(false);
          },
          error: (err) => {
            this.loading.set(false);

            const status = err?.status;
            const retryable =
              status === 0 || status === 408 || status === 429 || status >= 500;
            this.loadErrorRetryable.set(retryable);

            if (status === 401) {
              this.error.set('No tenés autorización para ver las mascotas. Iniciá sesión nuevamente.');
            } else if (status === 403) {
              this.error.set('No tenés permisos para ver las mascotas.');
            } else if (status === 0) {
              this.error.set('No pudimos conectar con el servidor. Revisá tu conexión.');
            } else {
              this.error.set('No pudimos cargar las mascotas. Intentá nuevamente.');
            }
          },
        });
      }

      retryLoad(): void {
        this.loadPets();
        this.listHeading()?.nativeElement.focus();
      }

      deletePet(pet: PetResponse): void {
        if (this.deletingId() !== null) {
          return;
        }

        const confirmed = window.confirm(
          `¿Dar de baja a la mascota "${pet.name}"? Esta acción no se puede deshacer.`,
        );

        if (!confirmed) {
          return;
        }

        this.deletingId.set(pet.externalId);
        this.deleteError.set(null);

        this.petService.delete(pet.externalId).subscribe({
          next: () => {
            this.pets.update((pets) =>
              pets.filter((item) => item.externalId !== pet.externalId),
            );
            this.deletingId.set(null);
          },
          error: (err) => {
            this.deletingId.set(null);
            if (err?.status === 404) {
              this.deleteError.set('La mascota ya no existe.');
            } else {
              this.deleteError.set('No pudimos eliminar la mascota. Intentá nuevamente.');
            }
          },
        });
      }
    }