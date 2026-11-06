import { Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
    import { ActivatedRoute, Router, RouterLink } from '@angular/router';
    import { OwnerService } from '../../services/owner';
    import { OwnerResponse } from '../../models/owner.model';
    import { PetResponse } from '../../../pets/models/pet.model';
    import { OwnerByPetService } from '../../../owners-by-pets/services/owner-by-pet';

    @Component({
      selector: 'app-owner-detail',
      standalone: true,
      imports: [RouterLink],
      templateUrl: './owner-detail.html',
      styleUrl: './owner-detail.css',
    })
    export class OwnerDetail implements OnInit {
      private route = inject(ActivatedRoute);
      private router = inject(Router);
      private ownerService = inject(OwnerService);
      private ownerByPetService = inject(OwnerByPetService);
      private detailHeading = viewChild<ElementRef<HTMLElement>>('detailHeading');

      owner = signal<OwnerResponse | null>(null);
      pets = signal<PetResponse[]>([]);
      petsLoading = signal<boolean>(true);

      loading = signal<boolean>(true);
      error = signal<string | null>(null);
      loadErrorRetryable = signal<boolean>(false);
      notFound = signal<boolean>(false);
      deleting = signal<boolean>(false);
      deleteError = signal<string | null>(null);

      ngOnInit(): void {
        const externalId = this.route.snapshot.paramMap.get('externalId');

        if (!externalId) {
          this.loading.set(false);
          this.notFound.set(true);
          return;
        }

        this.loadOwner(externalId);
      }

      loadOwner(externalId: string): void {
        this.loading.set(true);
        this.error.set(null);
        this.loadErrorRetryable.set(false);
        this.notFound.set(false);
        this.owner.set(null);
        this.petsLoading.set(true);

        this.ownerService.getById(externalId).subscribe({
          next: (owner) => {
            this.owner.set(owner);
            this.loading.set(false);
            this.loadOwnerPets(externalId);
          },
          error: (err) => {
            this.loading.set(false);
            this.petsLoading.set(false);

            const status = err?.status;
            const retryable =
              status === 0 || status === 408 || status === 429 || status >= 500;
            this.loadErrorRetryable.set(retryable);

            if (status === 404) {
              this.notFound.set(true);
            } else if (status === 401) {
              this.error.set(
                'No tenés autorización para ver este propietario. Iniciá sesión nuevamente.',
              );
            } else if (status === 403) {
              this.error.set('No tenés permisos para ver este propietario.');
            } else {
              this.error.set('No pudimos cargar los datos del propietario.');
            }
          },
        });
      }

      loadOwnerPets(ownerExternalId: string): void {
        this.ownerByPetService.getAll().subscribe({
          next: (relations) => {
            const ownerPets = relations
              .filter((r) => r.owner?.externalId === ownerExternalId && r.pet)
              .map((r) => r.pet);
            this.pets.set(ownerPets);
            this.petsLoading.set(false);
          },
          error: () => {
            this.petsLoading.set(false);
          },
        });
      }

      retryLoad(): void {
        const externalId = this.owner()?.externalId ?? this.route.snapshot.paramMap.get('externalId');
        if (externalId) {
          this.loadOwner(externalId);
          this.detailHeading()?.nativeElement.focus();
        }
      }

      deleteOwner(): void {
        const currentOwner = this.owner();
        if (!currentOwner || this.deleting()) {
          return;
        }

        const fullName = `${currentOwner.firstName} ${currentOwner.lastName}`.trim();
        const confirmed = window.confirm(
          `¿Eliminar al propietario "${fullName}"? Esta acción no se puede deshacer.`,
        );

        if (!confirmed) {
          return;
        }

        this.deleting.set(true);
        this.deleteError.set(null);

        this.ownerService.delete(currentOwner.externalId).subscribe({
          next: () => {
            this.deleting.set(false);
            this.router.navigate(['/owners']);
          },
          error: (err) => {
            this.deleting.set(false);
            if (err?.status === 404) {
              this.deleteError.set('El propietario ya no existe.');
            } else {
              this.deleteError.set('No pudimos eliminar al propietario. Intentá nuevamente.');
            }
          },
        });
      }
    }