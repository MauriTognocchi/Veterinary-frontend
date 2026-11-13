import {
      Component,
      ElementRef,
      OnInit,
      computed,
      inject,
      signal,
      viewChild,
    } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { ActivatedRoute, Router, RouterLink } from '@angular/router';
    import { PET_WRITE_ROLES } from '../../../../core/models/auth.model';
    import { AuthService } from '../../../../core/services/auth';
    import { ConditionResponse, ConditionService } from '../../../conditions/services/condition';
    import { OwnerResponse } from '../../../owners/models/owner.model';
    import { OwnerByPetService } from '../../../owners-by-pets/services/owner-by-pet';
    import {
      ConditionByPetRequest,
      ConditionByPetResponse,
      PetResponse,
      SeverityLevel,
    } from '../../models/pet.model';
    import { PetService } from '../../services/pet';
    import { VisitResponse } from '../../../visits/models/visit.model';
    import { VisitService } from '../../../visits/services/visit';
    
    const SEVERITY_LABELS: Record<SeverityLevel, string> = {
      MILD: 'Leve',
      MODERATE: 'Moderada',
      SEVERE: 'Grave',
    };
    
    const SEVERITY_CLASSES: Record<SeverityLevel, string> = {
      MILD: 'severity-mild',
      MODERATE: 'severity-moderate',
      SEVERE: 'severity-severe',
    };
    
    @Component({
      selector: 'app-pet-detail',
      standalone: true,
      imports: [FormsModule, RouterLink],
      templateUrl: './pet-detail.html',
      styleUrl: './pet-detail.css',
    })
    export class PetDetail implements OnInit {
      private route = inject(ActivatedRoute);
      private router = inject(Router);
      private petService = inject(PetService);
      private ownerByPetService = inject(OwnerByPetService);
      private visitService = inject(VisitService);
      private conditionService = inject(ConditionService);
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
      readonly canUpdateClinicalRecords = computed(() =>
        this.authService.hasAnyPermission(['UPDATE_CLINICAL_RECORDS']),
      );
      readonly canCreateClinicalRecords = computed(() =>
        this.authService.hasAnyPermission(['CREATE_CLINICAL_RECORDS']),
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
    
      // Description
      editingDescription = signal<boolean>(false);
      descriptionDraft = signal<string>('');
      descriptionSaving = signal<boolean>(false);
      descriptionError = signal<string | null>(null);
    
      // Conditions
      conditions = signal<ConditionByPetResponse[]>([]);
      conditionsLoading = signal<boolean>(false);
      conditionsError = signal<string | null>(null);
      conditionsErrorRetryable = signal<boolean>(false);
    
      // Associate condition
      showAssociateForm = signal<boolean>(false);
      catalogConditions = signal<ConditionResponse[]>([]);
      catalogLoading = signal<boolean>(false);
      catalogError = signal<string | null>(null);
      associating = signal<boolean>(false);
      associateError = signal<string | null>(null);
      selectedConditionId = signal<string>('');
      diagnosisDate = signal<string>('');
      severity = signal<SeverityLevel>('MILD');
      observations = signal<string>('');
    
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
            this.descriptionDraft.set(pet.description ?? '');
            if (this.canViewClinicalRecords()) {
              this.loadMedicalHistory(externalId);
              // this.loadConditions(externalId); // OCULTO TEMPORALMENTE PARA TP
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
    
      loadConditions(petExternalId: string): void {
        if (!this.canViewClinicalRecords()) {
          return;
        }
    
        this.conditionsLoading.set(true);
        this.conditionsError.set(null);
        this.conditionsErrorRetryable.set(false);
        this.conditions.set([]);
    
        this.petService.getConditionsByPet(petExternalId).subscribe({
          next: (conditions) => {
            this.conditions.set(
              [...conditions].sort(
                (a, b) =>
                  new Date(b.diagnosisDate).getTime() -
                  new Date(a.diagnosisDate).getTime(),
              ),
            );
            this.conditionsLoading.set(false);
          },
          error: (err) => {
            this.conditionsLoading.set(false);
            const status = err?.status;
            this.conditionsErrorRetryable.set(
              status === 0 || status === 408 || status === 429 || status >= 500,
            );
            if (status === 404) {
              this.conditions.set([]);
              this.conditionsLoading.set(false);
              return;
            }
            if (status === 0) {
              this.conditionsError.set(
                'No pudimos conectar con el servidor. Revisá tu conexión.',
              );
            } else {
              this.conditionsError.set(
                'No pudimos cargar las condiciones médicas. Intentá nuevamente.',
              );
            }
          },
        });
      }
    
      retryLoadConditions(): void {
        const pet = this.pet();
        if (pet) {
          this.loadConditions(pet.externalId);
        }
      }
    
      // Description editing
      startEditDescription(): void {
        const pet = this.pet();
        if (!pet) return;
        this.descriptionDraft.set(pet.description ?? '');
        this.editingDescription.set(true);
        this.descriptionError.set(null);
      }
    
      cancelEditDescription(): void {
        const pet = this.pet();
        if (pet) {
          this.descriptionDraft.set(pet.description ?? '');
        }
        this.editingDescription.set(false);
        this.descriptionError.set(null);
      }
    
      saveDescription(): void {
        const pet = this.pet();
        if (!pet || this.descriptionSaving()) return;
    
        const trimmed = this.descriptionDraft().trim();
        if (trimmed.length > 500) {
          this.descriptionError.set('La descripción no puede superar los 500 caracteres.');
          return;
        }
    
        this.descriptionSaving.set(true);
        this.descriptionError.set(null);
    
        const payload = { description: trimmed || null };
        this.petService.updateDescription(pet.externalId, payload).subscribe({
          next: (updatedPet) => {
            this.pet.set(updatedPet);
            this.descriptionDraft.set(updatedPet.description ?? '');
            this.editingDescription.set(false);
            this.descriptionSaving.set(false);
          },
          error: () => {
            this.descriptionSaving.set(false);
            this.descriptionError.set('No pudimos guardar la descripción. Intentá nuevamente.');
          },
        });
      }
    
      deleteDescription(): void {
        const pet = this.pet();
        if (!pet || this.descriptionSaving()) return;
    
        this.descriptionSaving.set(true);
        this.descriptionError.set(null);
    
        this.petService.updateDescription(pet.externalId, { description: null }).subscribe({
          next: (updatedPet) => {
            this.pet.set(updatedPet);
            this.descriptionDraft.set('');
            this.editingDescription.set(false);
            this.descriptionSaving.set(false);
          },
          error: () => {
            this.descriptionSaving.set(false);
            this.descriptionError.set('No pudimos eliminar la descripción. Intentá nuevamente.');
          },
        });
      }
    
      // Condition association
      loadCatalogConditions(): void {
        this.showAssociateForm.set(true);
        this.catalogLoading.set(true);
        this.catalogError.set(null);
        this.catalogConditions.set([]);
        this.selectedConditionId.set('');
        this.diagnosisDate.set('');
        this.severity.set('MILD');
        this.observations.set('');
        this.associateError.set(null);
        this.conditionService.getAll().subscribe({
          next: (conditions) => {
            this.catalogConditions.set(conditions);
            this.catalogLoading.set(false);
          },
          error: () => {
            this.catalogLoading.set(false);
            this.catalogError.set('No pudimos cargar el catálogo de condiciones.');
          },
        });
      }
    
      associateCondition(): void {
        const pet = this.pet();
        if (!pet || this.associating() || !this.selectedConditionId()) return;

        this.associating.set(true);
        this.associateError.set(null);

        const payload: ConditionByPetRequest = {
          conditionExternalId: this.selectedConditionId(),
          petExternalId: pet.externalId,
          diagnosisDate: this.diagnosisDate() || new Date().toISOString().slice(0, 19),
          severity: this.severity(),
          observations: this.observations().trim() || null,
        };

        this.petService.createConditionByPet(pet.externalId, payload).subscribe({
          next: () => {
            this.associating.set(false);
            this.showAssociateForm.set(false);
            this.catalogConditions.set([]);
            this.selectedConditionId.set('');
            this.diagnosisDate.set('');
            this.severity.set('MILD');
            this.observations.set('');
            this.associateError.set(null);
            this.loadConditions(pet.externalId);
          },
          error: (err) => {
            this.associating.set(false);
            if (err?.status === 409) {
              this.associateError.set('Esta condición ya está asociada a la mascota.');
            } else {
              this.associateError.set('No pudimos asociar la condición. Intentá nuevamente.');
            }
          },
        });
      }
    
      cancelAssociate(): void {
        this.showAssociateForm.set(false);
        this.catalogConditions.set([]);
        this.catalogLoading.set(false);
        this.catalogError.set(null);
        this.selectedConditionId.set('');
        this.diagnosisDate.set('');
        this.severity.set('MILD');
        this.observations.set('');
        this.associateError.set(null);
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
    
      severityLabel(severity: SeverityLevel): string {
        return SEVERITY_LABELS[severity] ?? severity;
      }
    
      severityClass(severity: SeverityLevel): string {
        return SEVERITY_CLASSES[severity] ?? '';
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