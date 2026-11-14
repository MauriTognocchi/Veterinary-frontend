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
    import { AuthService } from '../../../../core/services/auth';
    import { MedicationResponse } from '../../models/medication.model';
    import { MedicationService } from '../../services/medication';
    
    @Component({
      standalone: true,
      imports: [RouterLink],
      selector: 'app-medication-list',
      styleUrl: './medication-list.css',
      templateUrl: './medication-list.html',
    })
    export class MedicationList implements OnInit {
      private medicationService = inject(MedicationService);
      private authService = inject(AuthService);
      private listHeading = viewChild<ElementRef<HTMLElement>>('listHeading');
    
      readonly isAdmin = computed(() => this.authService.hasRole('ROLE_ADMIN'));
    
      medications = signal<MedicationResponse[]>([]);
      loading = signal<boolean>(true);
      error = signal<string | null>(null);
      loadErrorRetryable = signal<boolean>(false);
      deletingId = signal<string | null>(null);
      deleteError = signal<string | null>(null);
    
      ngOnInit(): void {
        this.loadMedications();
      }
    
      loadMedications(): void {
        this.loading.set(true);
        this.error.set(null);
        this.loadErrorRetryable.set(false);
        this.medications.set([]);
    
        this.medicationService.getAll().subscribe({
          next: (medications) => {
            this.medications.set(medications);
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
                'No tenés autorización para ver los medicamentos. Iniciá sesión nuevamente.',
              );
            } else if (status === 403) {
              this.error.set('No tenés permisos para ver los medicamentos.');
            } else if (status === 0) {
              this.error.set(
                'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
              );
            } else {
              this.error.set('No pudimos cargar los medicamentos.');
            }
          },
        });
      }
    
      retryLoad(): void {
        this.loadMedications();
        this.listHeading()?.nativeElement.focus();
      }
    
      deleteMedication(medication: MedicationResponse): void {
        if (this.deletingId() !== null) {
          return;
        }
    
        const confirmed = window.confirm(
          `¿Eliminar el medicamento "${medication.name}" (${medication.dosage} ${medication.dosageUnit})? Esta acción no se puede deshacer.`,
        );
    
        if (!confirmed) {
          return;
        }
    
        this.deletingId.set(medication.externalId);
        this.deleteError.set(null);
    
        this.medicationService.delete(medication.externalId).subscribe({
          next: () => {
            this.medications.update((items) =>
              items.filter((item) => item.externalId !== medication.externalId),
            );
            this.deletingId.set(null);
          },
          error: (err) => {
            this.deletingId.set(null);
            if (err?.status === 403) {
              this.deleteError.set(
                'Solo los administradores pueden eliminar medicamentos.',
              );
            } else {
              this.deleteError.set(
                'Ocurrió un error al intentar eliminar el medicamento.',
              );
            }
          },
        });
      }
    }