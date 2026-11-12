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
      private readonly authService = inject(AuthService);
      private readonly fb = inject(FormBuilder);
      private readonly diagnosesHeading = viewChild<ElementRef<HTMLElement>>('diagnosesHeading');
      private readonly studiesHeading = viewChild<ElementRef<HTMLElement>>('studiesHeading');

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

      diagnosisForm = this.fb.group({
        description: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(1000)]],
        dateDiagnosis: ['', [Validators.required]],
        observations: ['', [Validators.required, Validators.pattern(/\S/)]],
      });

      studyForm = this.fb.group({
        studyExternalId: ['', [Validators.required]],
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

        this.studyForm.reset({ studyExternalId: '' });
        this.studyFormError.set(null);
        this.studyFormVisible.set(true);
      }

      cancelStudyForm(): void {
        this.studyFormVisible.set(false);
        this.studyFormError.set(null);
        this.studyForm.reset({ studyExternalId: '' });
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

        const studyExternalId = this.studyForm.getRawValue().studyExternalId;
        if (!studyExternalId) {
          this.studyForm.markAllAsTouched();
          return;
        }

        this.studySubmitting.set(true);
        this.studyFormError.set(null);

        const request: StudyByVisitRequest = {
          studyExternalId,
          visitExternalId: currentVisit.externalId,
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

      isStudyFieldInvalid(): boolean {
        const control = this.studyForm.get('studyExternalId');
        return !!(control?.invalid && control?.touched);
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
    }
