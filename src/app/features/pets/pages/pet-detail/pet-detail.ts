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
    import { VisitResponse } from '../../../visits/models/visit.model';
    import { VisitService } from '../../../visits/services/visit';
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
      private visitService = inject(VisitService);
      private authService = inject(AuthService);
      private detailHeading = viewChild<ElementRef<HTMLElement>>('detailHeading');
    
      readonly canWrite = computed(() =>
        this.authService.hasAnyRole(PET_WRITE_ROLES),
      );
      readonly canDeletePet = computed(() =>
        this.authService.hasAnyPermission(['DELETE_PETS']),
      );
      readonly canViewOwners = computed(() =>
        this.authService.hasAnyPermission(['VIEW_OWNERS']),
      );
      readonly canViewClinicalRecords = computed(() =>
        this.authService.hasAnyPermission(['VIEW_CLINICAL_RECORDS']),
      );
    
      pet = signal<PetResponse | null>(null);
      owner = signal<OwnerResponse | null>(null);
      visits = signal<VisitResponse[]>([]);
      loading = signal<boolean>(true);
      error = signal<string | null>(null);
      notFound = signal<boolean>(false);
      deleting = signal<boolean>(false);
      deleteError = signal<string | null>(null);
      historyLoading = signal<boolean>(false);
      historyError = signal<string | null>(null);
      historyErrorRetryable = signal<boolean>(false);
    
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
            if (this.canViewClinicalRecords()) {
              this.loadMedicalHistory(externalId);
            }
            if (this.canViewOwners()) {
              this.loadOwner(externalId);
            } else {
              this.loading.set(false);
            }
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
    
      loadMedicalHistory(petExternalId: string): void {
        if (!this.canViewClinicalRecords()) {
          return;
        }
    
        this.historyLoading.set(true);
        this.historyError.set(null);
        this.historyErrorRetryable.set(false);
        this.visits.set([]);
    
        this.visitService.getMedicalHistory(petExternalId).subscribe({
          next: (visits) => {
            this.visits.set(
              [...visits].sort(
                (a, b) =>
                  new Date(b.visitDate).getTime() -
                  new Date(a.visitDate).getTime(),
              ),
            );
            this.historyLoading.set(false);
          },
          error: (err) => {
            this.historyLoading.set(false);
    
            const status = err?.status;
            this.historyErrorRetryable.set(
              status === 0 || status === 408 || status === 429 || status >= 500,
            );
    
            if (status === 401) {
              this.historyError.set(
                'No tenés autorización para ver el historial clínico. Iniciá sesión nuevamente.',
              );
            } else if (status === 403) {
              this.historyError.set(
                'No tenés permisos para ver el historial clínico.',
              );
            } else if (status === 0) {
              this.historyError.set(
                'No pudimos conectar con el servidor. Revisá tu conexión.',
              );
            } else {
              this.historyError.set(
                'No pudimos cargar el historial clínico. Intentá nuevamente.',
              );
            }
          },
        });
      }
    
      isWalkIn(visit: VisitResponse): boolean {
        return visit.appointment === null;
      }
    
      formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
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