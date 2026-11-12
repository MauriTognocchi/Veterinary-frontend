import { Component, ElementRef, computed, inject, signal, OnInit, viewChild } from '@angular/core';
    import { ActivatedRoute, RouterLink } from '@angular/router';
    import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
    import { VisitService } from '../../services/visit';
    import { VisitResponse } from '../../models/visit.model';
    import { AuthService } from '../../../../core/services/auth';
    import { DiagnosisRequest, DiagnosisResponse } from '../../../diagnoses/models/diagnosis.model';
    import { DiagnosisService } from '../../../diagnoses/services/diagnosis';

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
      private readonly authService = inject(AuthService);
      private readonly fb = inject(FormBuilder);
      private readonly diagnosesHeading = viewChild<ElementRef<HTMLElement>>('diagnosesHeading');

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

      diagnosisForm = this.fb.group({
        description: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(1000)]],
        dateDiagnosis: ['', [Validators.required]],
        observations: ['', [Validators.required, Validators.pattern(/\S/)]],
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
