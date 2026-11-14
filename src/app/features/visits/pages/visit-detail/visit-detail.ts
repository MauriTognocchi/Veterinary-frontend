import { Component, ElementRef, computed, inject, signal, OnInit, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { VisitService } from '../../services/visit';
import { VisitResponse } from '../../models/visit.model';
import { AuthService } from '../../../../core/services/auth';
import { DiagnosisRequest, DiagnosisResponse } from '../../../diagnoses/models/diagnosis.model';
import { DiagnosisService } from '../../../diagnoses/services/diagnosis';
import { StudyByVisitRequest, StudyByVisitResponse, StudyResponse } from '../../../studies/models/study.model';
import { StudyService } from '../../../studies/services/study';
import { PrescriptionRequest, PrescriptionResponse } from '../../../prescriptions/models/prescription.model';
import { PrescriptionService } from '../../../prescriptions/services/prescription';
import { MedicationResponse } from '../../../medications/models/medication.model';
import { MedicationService } from '../../../medications/services/medication';

@Component({
  selector: 'app-visit-detail',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './visit-detail.html',
  styleUrl: './visit-detail.css',
})
export class VisitDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly visitService = inject(VisitService);
  private readonly diagnosisService = inject(DiagnosisService);
  private readonly studyService = inject(StudyService);
  private readonly prescriptionService = inject(PrescriptionService);
  private readonly medicationService = inject(MedicationService);
  private readonly authService = inject(AuthService);

  readonly isAdmin = () => this.authService.hasAnyRole(['ROLE_ADMIN']);
  private readonly fb = inject(FormBuilder);
  private readonly diagnosesHeading = viewChild<ElementRef<HTMLElement>>('diagnosesHeading');
  private readonly studiesHeading = viewChild<ElementRef<HTMLElement>>('studiesHeading');
  private readonly prescriptionsHeading = viewChild<ElementRef<HTMLElement>>('prescriptionsHeading');

  visit = signal<VisitResponse | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  diagnoses = signal<DiagnosisResponse[]>([]);
  diagnosesLoading = signal(false);
  diagnosesError = signal<string | null>(null);
  diagnosesErrorRetryable = signal(false);

  diagnosisFormVisible = signal(false);
  editingDiagnosis = signal<DiagnosisResponse | null>(null);
  diagnosisSubmitting = signal(false);
  diagnosisFormError = signal<string | null>(null);
  deletingDiagnosisId = signal<string | null>(null);
  diagnosisDeleteError = signal<string | null>(null);

  private diagnosesRequestId = 0;

  studyAssociations = signal<StudyByVisitResponse[]>([]);
  readonly studies = computed(() =>
    this.studyAssociations().filter(
      (association) => association.active !== false,
    ),
  );
  studiesLoading = signal(false);
  studiesError = signal<string | null>(null);
  studiesErrorRetryable = signal(false);

  studyCatalog = signal<StudyResponse[]>([]);
  studyCatalogLoading = signal(false);
  studyCatalogError = signal<string | null>(null);

  studyFormVisible = signal(false);
  studySubmitting = signal(false);
  studyFormError = signal<string | null>(null);
  deletingStudyId = signal<string | null>(null);
  studyDeleteError = signal<string | null>(null);

  private studiesRequestId = 0;

  prescriptions = signal<PrescriptionResponse[]>([]);
  prescriptionsLoading = signal(false);
  prescriptionsError = signal<string | null>(null);
  prescriptionsErrorRetryable = signal(false);

  medicationCatalog = signal<MedicationResponse[]>([]);
  medicationCatalogLoading = signal(false);
  medicationCatalogError = signal<string | null>(null);

  prescriptionFormVisible = signal(false);
  prescriptionSubmitting = signal(false);
  prescriptionFormError = signal<string | null>(null);
  deletingPrescriptionId = signal<string | null>(null);
  prescriptionDeleteError = signal<string | null>(null);

  private prescriptionsRequestId = 0;

  diagnosisForm = this.fb.group({
    description: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(1000)]],
    dateDiagnosis: ['', [Validators.required]],
    observations: ['', [Validators.required, Validators.pattern(/\S/)]],
  });

  studyForm = this.fb.group({
    studyExternalId: ['', [Validators.required]],
    description: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
  });

  prescriptionForm = this.fb.group({
    quantity: [
      1,
      [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)],
    ],
    indication: ['', [Validators.required, Validators.pattern(/\S/)]],
    expirationDate: ['', [Validators.required]],
    medicationExternalId: ['', [Validators.required]],
    diagnosisExternalId: ['', [Validators.required]],
  });

  get canEdit(): boolean {
    return this.authService.hasAnyRole(['ROLE_VETERINARIAN']);
  }

  readonly canViewDiagnoses = computed(() =>
    this.authService.hasAnyPermission(['VIEW_CLINICAL_RECORDS']),
  );

  readonly canManageDiagnoses = computed(() =>
    this.authService.hasAnyRole(['ROLE_VETERINARIAN']),
  );

  readonly canDeleteDiagnoses = computed(() =>
    this.authService.hasAnyPermission(['DELETE_DIAGNOSES']),
  );

  readonly canViewStudies = computed(() =>
    this.authService.hasAnyPermission(['VIEW_CLINICAL_RECORDS']),
  );

  readonly canAddStudies = computed(() =>
    this.authService.hasAnyPermission(['CREATE_CLINICAL_RECORDS']),
  );

  readonly canRemoveStudies = computed(() =>
    this.authService.hasAnyRole(['ROLE_ADMIN']),
  );

  readonly canViewPrescriptions = computed(() =>
    this.authService.hasAnyPermission(['VIEW_CLINICAL_RECORDS']),
  );

  readonly canManagePrescriptions = computed(() =>
    this.authService.hasAnyRole(['ROLE_VETERINARIAN']),
  );

  readonly canViewMedications = computed(() =>
    this.authService.hasAnyPermission(['VIEW_MEDICATIONS']),
  );

  readonly availableStudies = computed(() => {
    const associated = new Set(
      this.studyAssociations().map(
        (association) => association.study.externalId,
      ),
    );

    return this.studyCatalog().filter(
      (study) => !associated.has(study.externalId),
    );
  });

  ngOnInit(): void {
    const externalId = this.route.snapshot.paramMap.get('externalId')!;
    this.load(externalId);
  }

  private load(externalId: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.visitService.getById(externalId).subscribe({
      next: (data) => {
        this.visit.set(data);
        this.loading.set(false);
        if (this.canViewDiagnoses()) {
          this.loadDiagnoses(externalId);
        }
        if (this.canViewStudies()) {
          this.loadStudies(externalId);
        }
        if (this.canAddStudies()) {
          this.loadStudyCatalog();
        }
        if (this.canViewPrescriptions()) {
          this.loadPrescriptions(externalId);
        }
        if (this.canManagePrescriptions() && this.canViewMedications()) {
          this.loadMedicationCatalog();
        }
      },
      error: () => {
        this.error.set('Error al cargar la visita.');
        this.loading.set(false);
      },
    });
  }

  loadDiagnoses(visitExternalId: string): void {
    if (!this.canViewDiagnoses()) {
      return;
    }

    this.diagnosesLoading.set(true);
    this.diagnosesError.set(null);
    this.diagnosesErrorRetryable.set(false);
    this.diagnoses.set([]);

    const requestId = ++this.diagnosesRequestId;

    this.diagnosisService.getByVisit(visitExternalId).subscribe({
      next: (diagnoses) => {
        if (requestId !== this.diagnosesRequestId) {
          return;
        }

        this.diagnoses.set(this.sortDiagnoses(diagnoses));
        this.diagnosesLoading.set(false);
      },
      error: (err) => {
        if (requestId !== this.diagnosesRequestId) {
          return;
        }

        this.diagnosesLoading.set(false);

        const status = err?.status;
        this.diagnosesErrorRetryable.set(
          status === 0 || status === 408 || status === 429 || status >= 500,
        );

        if (status === 401) {
          this.diagnosesError.set(
            'No tenés autorización para ver los diagnósticos. Iniciá sesión nuevamente.',
          );
        } else if (status === 403) {
          this.diagnosesError.set('No tenés permisos para ver los diagnósticos.');
        } else if (status === 0) {
          this.diagnosesError.set(
            'No pudimos conectar con el servidor. Revisá tu conexión.',
          );
        } else {
          this.diagnosesError.set(
            'No pudimos cargar los diagnósticos. Intentá nuevamente.',
          );
        }
      },
    });
  }

  retryDiagnoses(): void {
    const currentVisit = this.visit();
    if (!currentVisit) {
      return;
    }

    this.loadDiagnoses(currentVisit.externalId);
    this.diagnosesHeading()?.nativeElement.focus();
  }

  openCreateForm(): void {
    if (this.diagnosesLoading()) {
      return;
    }

    this.diagnosisForm.reset({
      description: '',
      dateDiagnosis: this.formattedNow(),
      observations: '',
    });
    this.editingDiagnosis.set(null);
    this.diagnosisFormError.set(null);
    this.diagnosisFormVisible.set(true);
  }

  startEdit(diagnosis: DiagnosisResponse): void {
    if (this.diagnosesLoading()) {
      return;
    }

    this.diagnosisForm.reset({
      description: diagnosis.description,
      dateDiagnosis: this.toDateTimeLocal(diagnosis.dateDiagnosis),
      observations: diagnosis.observations,
    });
    this.editingDiagnosis.set(diagnosis);
    this.diagnosisFormError.set(null);
    this.diagnosisFormVisible.set(true);
  }

  cancelDiagnosisForm(): void {
    this.diagnosisFormVisible.set(false);
    this.editingDiagnosis.set(null);
    this.diagnosisFormError.set(null);
    this.diagnosisForm.reset({
      description: '',
      dateDiagnosis: '',
      observations: '',
    });
  }

  submitDiagnosis(): void {
    if (this.diagnosisForm.invalid) {
      this.diagnosisForm.markAllAsTouched();
      return;
    }

    const currentVisit = this.visit();
    if (!currentVisit || this.diagnosisSubmitting()) {
      return;
    }

    if (this.diagnosesLoading()) {
      this.diagnosisFormError.set(
        'Esperá a que terminen de cargar los diagnósticos.',
      );
      return;
    }

    this.diagnosisSubmitting.set(true);
    this.diagnosisFormError.set(null);

    const value = this.diagnosisForm.getRawValue();
    const request: DiagnosisRequest = {
      description: (value.description ?? '').trim(),
      dateDiagnosis: value.dateDiagnosis ?? '',
      observations: (value.observations ?? '').trim(),
      visitExternalId: currentVisit.externalId,
    };

    const editing = this.editingDiagnosis();
    const request$ = editing
      ? this.diagnosisService.update(editing.externalId, request)
      : this.diagnosisService.create(request);

    request$.subscribe({
      next: (diagnosis) => {
        this.diagnosesRequestId++;
        this.diagnosesLoading.set(false);

        this.diagnoses.update((items) =>
          this.sortDiagnoses(
            editing
              ? items.map((item) =>
                item.externalId === diagnosis.externalId ? diagnosis : item,
              )
              : [...items, diagnosis],
          ),
        );
        this.diagnosisFormVisible.set(false);
        this.editingDiagnosis.set(null);
        this.diagnosisSubmitting.set(false);
      },
      error: (err) => {
        this.diagnosisSubmitting.set(false);
        if (err?.status === 403) {
          this.diagnosisFormError.set(
            'Solo los veterinarios pueden registrar o editar diagnósticos.',
          );
        } else {
          this.diagnosisFormError.set(
            'No pudimos guardar el diagnóstico. Intentá nuevamente.',
          );
        }
      },
    });
  }

  deleteDiagnosis(diagnosis: DiagnosisResponse): void {
    if (this.deletingDiagnosisId() !== null) {
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar el diagnóstico "${diagnosis.description}"? Esta acción no se puede deshacer.`,
    );

    if (!confirmed) {
      return;
    }

    this.deletingDiagnosisId.set(diagnosis.externalId);
    this.diagnosisDeleteError.set(null);

    this.diagnosisService.delete(diagnosis.externalId).subscribe({
      next: () => {
        this.diagnoses.update((items) =>
          items.filter((item) => item.externalId !== diagnosis.externalId),
        );
        this.deletingDiagnosisId.set(null);
      },
      error: (err) => {
        this.deletingDiagnosisId.set(null);
        if (err?.status === 403) {
          this.diagnosisDeleteError.set(
            'Solo los administradores pueden eliminar diagnósticos.',
          );
        } else {
          this.diagnosisDeleteError.set(
            'No pudimos eliminar el diagnóstico. Intentá nuevamente.',
          );
        }
      },
    });
  }

  isDiagnosisFieldInvalid(field: string): boolean {
    const control = this.diagnosisForm.get(field);
    return !!(control?.invalid && control?.touched);
  }

  loadStudies(visitExternalId: string): void {
    if (!this.canViewStudies()) {
      return;
    }

    this.studiesLoading.set(true);
    this.studiesError.set(null);
    this.studiesErrorRetryable.set(false);
    this.studyAssociations.set([]);

    const requestId = ++this.studiesRequestId;

    this.studyService.getAssociations().subscribe({
      next: (associations) => {
        if (requestId !== this.studiesRequestId) {
          return;
        }

        this.studyAssociations.set(
          this.sortStudies(
            associations.filter(
              (association) =>
                association.visit?.externalId === visitExternalId,
            ),
          ),
        );
        this.studiesLoading.set(false);
      },
      error: (err) => {
        if (requestId !== this.studiesRequestId) {
          return;
        }

        this.studiesLoading.set(false);

        const status = err?.status;
        this.studiesErrorRetryable.set(
          status === 0 || status === 408 || status === 429 || status >= 500,
        );

        if (status === 401) {
          this.studiesError.set(
            'No tenés autorización para ver los estudios. Iniciá sesión nuevamente.',
          );
        } else if (status === 403) {
          this.studiesError.set('No tenés permisos para ver los estudios.');
        } else if (status === 0) {
          this.studiesError.set(
            'No pudimos conectar con el servidor. Revisá tu conexión.',
          );
        } else {
          this.studiesError.set(
            'No pudimos cargar los estudios. Intentá nuevamente.',
          );
        }
      },
    });
  }

  retryStudies(): void {
    const currentVisit = this.visit();
    if (!currentVisit) {
      return;
    }

    this.loadStudies(currentVisit.externalId);
    this.studiesHeading()?.nativeElement.focus();
  }

  loadStudyCatalog(): void {
    if (!this.canAddStudies()) {
      return;
    }

    this.studyCatalogLoading.set(true);
    this.studyCatalogError.set(null);

    this.studyService.getAll().subscribe({
      next: (studies) => {
        this.studyCatalog.set(
          [...studies].sort((a, b) => a.name.localeCompare(b.name, 'es')),
        );
        this.studyCatalogLoading.set(false);
      },
      error: (err) => {
        this.studyCatalogLoading.set(false);

        if (err?.status === 403) {
          this.studyCatalogError.set(
            'No tenés permisos para consultar los estudios disponibles.',
          );
        } else {
          this.studyCatalogError.set(
            'No pudimos cargar los estudios disponibles. Intentá nuevamente.',
          );
        }
      },
    });
  }

  retryStudyCatalog(): void {
    this.loadStudyCatalog();
  }

  openStudyForm(): void {
    if (this.studiesLoading()) {
      return;
    }

    this.studyForm.reset({ studyExternalId: '', description: '' });
    this.studyFormError.set(null);
    this.studyFormVisible.set(true);
  }

  cancelStudyForm(): void {
    this.studyFormVisible.set(false);
    this.studyFormError.set(null);
    this.studyForm.reset({ studyExternalId: '', description: '' });
  }

  submitStudy(): void {
    if (this.studyForm.invalid) {
      this.studyForm.markAllAsTouched();
      return;
    }

    const currentVisit = this.visit();
    if (!currentVisit || this.studySubmitting()) {
      return;
    }

    if (this.studiesLoading()) {
      this.studyFormError.set(
        'Esperá a que terminen de cargar los estudios.',
      );
      return;
    }

    const value = this.studyForm.getRawValue();
    const studyExternalId = value.studyExternalId;
    const description = (value.description ?? '').trim();

    if (!studyExternalId) {
      this.studyForm.markAllAsTouched();
      return;
    }

    this.studySubmitting.set(true);
    this.studyFormError.set(null);

    const request: StudyByVisitRequest = {
      studyExternalId,
      visitExternalId: currentVisit.externalId,
      description,
    };

    this.studyService.associate(request).subscribe({
      next: (association) => {
        this.studiesRequestId++;
        this.studiesLoading.set(false);

        this.studyAssociations.update((items) =>
          this.sortStudies([...items, association]),
        );
        this.studyFormVisible.set(false);
        this.studySubmitting.set(false);
      },
      error: (err) => {
        this.studySubmitting.set(false);

        if (err?.status === 409) {
          this.studyFormError.set(
            'Este estudio ya está asociado a la visita.',
          );
        } else if (err?.status === 403) {
          this.studyFormError.set(
            'No tenés permisos para asociar estudios.',
          );
        } else {
          this.studyFormError.set(
            'No pudimos asociar el estudio. Intentá nuevamente.',
          );
        }
      },
    });
  }

  removeStudy(association: StudyByVisitResponse): void {
    if (this.deletingStudyId() !== null) {
      return;
    }

    const confirmed = window.confirm(
      `¿Quitar el estudio "${association.study.name}" de la visita?`,
    );

    if (!confirmed) {
      return;
    }

    this.deletingStudyId.set(association.externalId);
    this.studyDeleteError.set(null);

    this.studyService
      .deactivateAssociation(association.externalId)
      .subscribe({
        next: () => {
          this.studiesRequestId++;
          this.studiesLoading.set(false);

          this.studyAssociations.update((items) =>
            items.map((item) =>
              item.externalId === association.externalId
                ? { ...item, active: false }
                : item,
            ),
          );
          this.deletingStudyId.set(null);
        },
        error: (err) => {
          this.deletingStudyId.set(null);

          if (err?.status === 403) {
            this.studyDeleteError.set(
              'Solo los administradores pueden quitar estudios.',
            );
          } else {
            this.studyDeleteError.set(
              'No pudimos quitar el estudio. Intentá nuevamente.',
            );
          }
        },
      });
  }

  isStudyFieldInvalid(field: string): boolean {
    const control = this.studyForm.get(field);
    return !!(control?.invalid && control?.touched);
  }

  loadPrescriptions(visitExternalId: string): void {
    if (!this.canViewPrescriptions()) {
      return;
    }

    this.prescriptionsLoading.set(true);
    this.prescriptionsError.set(null);
    this.prescriptionsErrorRetryable.set(false);
    this.prescriptions.set([]);

    const requestId = ++this.prescriptionsRequestId;

    this.prescriptionService.getByVisit(visitExternalId).subscribe({
      next: (prescriptions) => {
        if (requestId !== this.prescriptionsRequestId) {
          return;
        }

        this.prescriptions.set(
          this.sortPrescriptions(
            prescriptions.filter(
              (prescription) => prescription.active !== false,
            ),
          ),
        );
        this.prescriptionsLoading.set(false);
      },
      error: (err) => {
        if (requestId !== this.prescriptionsRequestId) {
          return;
        }

        this.prescriptionsLoading.set(false);

        const status = err?.status;
        this.prescriptionsErrorRetryable.set(
          status === 0 || status === 408 || status === 429 || status >= 500,
        );

        if (status === 401) {
          this.prescriptionsError.set(
            'No tenés autorización para ver las prescripciones. Iniciá sesión nuevamente.',
          );
        } else if (status === 403) {
          this.prescriptionsError.set(
            'No tenés permisos para ver las prescripciones.',
          );
        } else if (status === 0) {
          this.prescriptionsError.set(
            'No pudimos conectar con el servidor. Revisá tu conexión.',
          );
        } else {
          this.prescriptionsError.set(
            'No pudimos cargar las prescripciones. Intentá nuevamente.',
          );
        }
      },
    });
  }

  retryPrescriptions(): void {
    const currentVisit = this.visit();
    if (!currentVisit) {
      return;
    }

    this.loadPrescriptions(currentVisit.externalId);
    this.prescriptionsHeading()?.nativeElement.focus();
  }

  retryPrescriptionDiagnoses(): void {
    const currentVisit = this.visit();
    if (!currentVisit) {
      return;
    }

    this.loadDiagnoses(currentVisit.externalId);
  }

  loadMedicationCatalog(): void {
    if (!this.canManagePrescriptions() || !this.canViewMedications()) {
      return;
    }

    this.medicationCatalogLoading.set(true);
    this.medicationCatalogError.set(null);

    this.medicationService.getAll().subscribe({
      next: (medications) => {
        this.medicationCatalog.set(
          [...medications].sort((a, b) =>
            a.name.localeCompare(b.name, 'es'),
          ),
        );
        this.medicationCatalogLoading.set(false);
      },
      error: (err) => {
        this.medicationCatalogLoading.set(false);

        if (err?.status === 403) {
          this.medicationCatalogError.set(
            'No tenés permisos para consultar los medicamentos disponibles.',
          );
        } else {
          this.medicationCatalogError.set(
            'No pudimos cargar los medicamentos disponibles. Intentá nuevamente.',
          );
        }
      },
    });
  }

  retryMedicationCatalog(): void {
    this.loadMedicationCatalog();
  }

  openPrescriptionForm(): void {
    if (this.prescriptionsLoading()) {
      return;
    }

    this.prescriptionForm.reset({
      quantity: 1,
      indication: '',
      expirationDate: this.defaultExpirationDate(),
      medicationExternalId: '',
      diagnosisExternalId: '',
    });
    this.prescriptionFormError.set(null);
    this.prescriptionFormVisible.set(true);
  }

  cancelPrescriptionForm(): void {
    this.prescriptionFormVisible.set(false);
    this.prescriptionFormError.set(null);
    this.prescriptionForm.reset({
      quantity: 1,
      indication: '',
      expirationDate: '',
      medicationExternalId: '',
      diagnosisExternalId: '',
    });
  }

  submitPrescription(): void {
    const currentVisit = this.visit();
    if (!currentVisit || this.prescriptionSubmitting()) {
      return;
    }

    if (this.diagnosesLoading()) {
      this.prescriptionFormError.set(
        'Esperá a que terminen de cargar los diagnósticos.',
      );
      return;
    }

    if (this.diagnosesError()) {
      this.prescriptionFormError.set(
        'No se puede prescribir mientras no se carguen los diagnósticos.',
      );
      return;
    }

    if (this.prescriptionsLoading()) {
      this.prescriptionFormError.set(
        'Esperá a que terminen de cargar las prescripciones.',
      );
      return;
    }

    if (this.prescriptionForm.invalid) {
      this.prescriptionForm.markAllAsTouched();
      return;
    }

    const value = this.prescriptionForm.getRawValue();
    const quantity = Number(value.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      this.prescriptionForm.get('quantity')?.markAsTouched();
      this.prescriptionFormError.set(
        'La cantidad debe ser un número entero mayor a 0.',
      );
      return;
    }

    this.prescriptionSubmitting.set(true);
    this.prescriptionFormError.set(null);

    const request: PrescriptionRequest = {
      quantity,
      indication: (value.indication ?? '').trim(),
      expirationDate: value.expirationDate ?? '',
      medicationExternalId: value.medicationExternalId ?? '',
      diagnosisExternalId: value.diagnosisExternalId ?? '',
    };

    this.prescriptionService.create(request).subscribe({
      next: (prescription) => {
        this.prescriptionsRequestId++;
        this.prescriptionsLoading.set(false);

        this.prescriptions.update((items) =>
          this.sortPrescriptions([...items, prescription]),
        );
        this.prescriptionFormVisible.set(false);
        this.prescriptionSubmitting.set(false);
      },
      error: (err) => {
        this.prescriptionSubmitting.set(false);

        if (err?.status === 403) {
          this.prescriptionFormError.set(
            'Solo los veterinarios pueden registrar prescripciones.',
          );
        } else if (err?.status === 409) {
          this.prescriptionFormError.set(
            'No se puede prescribir: el diagnóstico tiene más de un mes de antigüedad.',
          );
        } else {
          this.prescriptionFormError.set(
            'No pudimos guardar la prescripción. Revisá los datos e intentá nuevamente.',
          );
        }
      },
    });
  }

  removePrescription(prescription: PrescriptionResponse): void {
    if (this.deletingPrescriptionId() !== null) {
      return;
    }

    const confirmed = window.confirm(
      `¿Dar de baja la prescripción de "${prescription.medication.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    this.deletingPrescriptionId.set(prescription.externalId);
    this.prescriptionDeleteError.set(null);

    this.prescriptionService.delete(prescription.externalId).subscribe({
      next: () => {
        this.prescriptionsRequestId++;
        this.prescriptionsLoading.set(false);

        this.prescriptions.update((items) =>
          items.filter(
            (item) => item.externalId !== prescription.externalId,
          ),
        );
        this.deletingPrescriptionId.set(null);
      },
      error: (err) => {
        this.deletingPrescriptionId.set(null);

        if (err?.status === 403) {
          this.prescriptionDeleteError.set(
            'Solo los veterinarios pueden dar de baja prescripciones.',
          );
        } else if (err?.status === 409) {
          this.prescriptionDeleteError.set(
            'La prescripción ya estaba dada de baja.',
          );
        } else {
          this.prescriptionDeleteError.set(
            'No pudimos dar de baja la prescripción. Intentá nuevamente.',
          );
        }
      },
    });
  }

  isPrescriptionFieldInvalid(field: string): boolean {
    const control = this.prescriptionForm.get(field);
    return !!(control?.invalid && control?.touched);
  }

  private sortPrescriptions(
    prescriptions: PrescriptionResponse[],
  ): PrescriptionResponse[] {
    return [...prescriptions].sort((a, b) =>
      a.expirationDate.localeCompare(b.expirationDate),
    );
  }

  private defaultExpirationDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    const pad = (value: number) => String(value).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  private sortStudies(
    studies: StudyByVisitResponse[],
  ): StudyByVisitResponse[] {
    return [...studies].sort((a, b) =>
      a.study.name.localeCompare(b.study.name, 'es'),
    );
  }

  private sortDiagnoses(diagnoses: DiagnosisResponse[]): DiagnosisResponse[] {
    return [...diagnoses].sort(
      (a, b) =>
        new Date(b.dateDiagnosis).getTime() -
        new Date(a.dateDiagnosis).getTime(),
    );
  }

  private toDateTimeLocal(value: string): string {
    if (!value) {
      return '';
    }

    const match = value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    if (match) {
      return match[0];
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return this.formatDateForInput(date);
  }

  private formattedNow(): string {
    return this.formatDateForInput(new Date());
  }

  private formatDateForInput(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');

    return [
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
      `${pad(date.getHours())}:${pad(date.getMinutes())}`,
    ].join('T');
  }

  isWalkIn(): boolean {
    return this.visit()?.appointment === null;
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

  formatDateOnly(dateStr: string): string {
    const [year, month, day] = dateStr.split('-');
    return day && month && year ? `${day}/${month}/${year}` : dateStr;
  }
}
