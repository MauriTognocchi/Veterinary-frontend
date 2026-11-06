import {
      Component,
      ElementRef,
      OnInit,
      computed,
      inject,
      signal,
      viewChild,
    } from '@angular/core';
    import { ActivatedRoute, Router, RouterLink } from '@angular/router';
    import { PET_WRITE_ROLES } from '../../../../core/models/auth.model';
    import { AuthService } from '../../../../core/services/auth';
    import { OwnerResponse } from '../../../owners/models/owner.model';
    import { OwnerByPetService } from '../../../owners-by-pets/services/owner-by-pet';
    import { PetResponse } from '../../models/pet.model';
    import { PetService } from '../../services/pet';
    
    @Component({
      selector: 'app-pet-detail',
      standalone: true,
      imports: [RouterLink],
      templateUrl: './pet-detail.html',
      styleUrl: './pet-detail.css',
    })
    export class PetDetail implements OnInit {
      private route = inject(ActivatedRoute);
      private router = inject(Router);
      private petService = inject(PetService);
      private ownerByPetService = inject(OwnerByPetService);
      private authService = inject(AuthService);
      private detailHeading = viewChild<ElementRef<HTMLElement>>('detailHeading');
    
      readonly canWrite = computed(() =>
        this.authService.hasAnyRole(PET_WRITE_ROLES),
      );
    
      pet = signal<PetResponse | null>(null);
      owner = signal<OwnerResponse | null>(null);
      loading = signal<boolean>(true);
      error = signal<string | null>(null);
      notFound = signal<boolean>(false);
      deleting = signal<boolean>(false);
      deleteError = signal<string | null>(null);
    
      ngOnInit(): void {
        const externalId = this.route.snapshot.paramMap.get('externalId');
        if (!externalId) {
          this.notFound.set(true);
          this.loading.set(false);
          return;
        }
        this.loadPet(externalId);
      }
    
      loadPet(externalId: string): void {
        this.loading.set(true);
        this.error.set(null);
        this.notFound.set(false);
    
        this.petService.getById(externalId).subscribe({
          next: (pet) => {
            this.pet.set(pet);
            this.loadOwner(externalId);
          },
          error: (err) => {
            this.loading.set(false);
            if (err?.status === 404) {
              this.notFound.set(true);
            } else {
              this.error.set('No pudimos cargar los datos de la mascota.');
            }
          },
        });
      }
    
      loadOwner(petExternalId: string): void {
        this.ownerByPetService.getAll().subscribe({
          next: (relations) => {
            const rel = relations.find((r) => r.pet?.externalId === petExternalId);
            if (rel?.owner) {
              this.owner.set(rel.owner);
            }
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      }
    
      deletePet(): void {
        const currentPet = this.pet();
        if (!currentPet || this.deleting()) return;
    
        const confirmed = window.confirm(
          `¿Dar de baja a la mascota "${currentPet.name}"? Esta acción no se puede deshacer.`,
        );
    
        if (!confirmed) return;
    
        this.deleting.set(true);
        this.deleteError.set(null);
    
        this.petService.delete(currentPet.externalId).subscribe({
          next: () => {
            this.deleting.set(false);
            this.router.navigate(['/pets']);
          },
          error: () => {
            this.deleting.set(false);
            this.deleteError.set('No pudimos eliminar la mascota.');
          },
        });
      }
    }