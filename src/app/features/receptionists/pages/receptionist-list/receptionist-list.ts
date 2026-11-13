 import {
      Component,
      ElementRef,
      OnInit,
      computed,
      inject,
      signal,
      viewChild,
    } from '@angular/core';
    import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
    import { RouterLink } from '@angular/router';
    import { RECEPTIONIST_ADMIN_ROLES } from '../../../../core/models/auth.model';
    import { AuthService } from '../../../../core/services/auth';
    import { BranchResponse } from '../../../branches/models/branch.model';
    import { BranchService } from '../../../branches/services/branch';
    import {
      ReceptionistFilters,
      ReceptionistResponse,
    } from '../../models/receptionist.model';
    import { ReceptionistService } from '../../services/receptionist';

    @Component({
      selector: 'app-receptionist-list',
      standalone: true,
      imports: [ReactiveFormsModule, RouterLink],
      styleUrl: './receptionist-list.css',
      templateUrl: './receptionist-list.html',
    })
    export class ReceptionistList implements OnInit {
      private fb = inject(FormBuilder);
      private receptionistService = inject(ReceptionistService);
      private branchService = inject(BranchService);
      private authService = inject(AuthService);
      private listHeading = viewChild<ElementRef<HTMLElement>>('listHeading');

      readonly isAdmin = computed(() =>
        this.authService.hasAnyRole(RECEPTIONIST_ADMIN_ROLES),
      );

      receptionists = signal<ReceptionistResponse[]>([]);
      branches = signal<BranchResponse[]>([]);
      loading = signal<boolean>(true);
      error = signal<string | null>(null);
      loadErrorRetryable = signal<boolean>(false);
      appliedFilters = signal<boolean>(false);
      branchesLoadError = signal<boolean>(false);
      deletingId = signal<string | null>(null);
      deleteError = signal<string | null>(null);
      reactivatingId = signal<string | null>(null);
      reactivateError = signal<string | null>(null);
      success = signal<string | null>(null);
      statusFilter = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
      readonly actionPending = computed(() => this.deletingId() !== null || this.reactivatingId() !== null);
      readonly filteredReceptionists = computed(() => this.receptionists().filter((person) =>
        !this.isAdmin() || this.statusFilter() === 'ALL' || person.active === (this.statusFilter() === 'ACTIVE'),
      ));

      filtersForm = this.fb.nonNullable.group({
        firstName: [''],
        lastName: [''],
        branchExternalId: [''],
      });

      ngOnInit(): void {
        this.loadReceptionists();
        if (this.isAdmin()) this.loadBranches();
      }

      loadReceptionists(): void {
        if (this.actionPending()) return;
        this.loading.set(true);
        this.error.set(null);
        this.loadErrorRetryable.set(false);
        this.receptionists.set([]);

        const raw = this.filtersForm.getRawValue();
        const filters: ReceptionistFilters = {
          firstName: raw.firstName,
          lastName: raw.lastName,
          branchExternalId: this.isAdmin() ? raw.branchExternalId : undefined,
        };

        this.appliedFilters.set(
          Boolean(
            filters.firstName?.trim() ||
              filters.lastName?.trim() ||
              filters.branchExternalId?.trim(),
          ),
        );

        this.receptionistService.getAll(filters).subscribe({
          next: (receptionists) => {
            this.receptionists.set(receptionists);
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
                'No tenés autorización para ver los recepcionistas. Iniciá sesión nuevamente.',
              );
            } else if (status === 403) {
              this.error.set('No tenés permisos para ver los recepcionistas.');
            } else if (status === 404) {
              this.error.set('No encontramos la información solicitada.');
            } else if (status === 0) {
              this.error.set(
                'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
              );
            } else if (status >= 500 || status === 408 || status === 429) {
              this.error.set(
                'No pudimos cargar los recepcionistas. Intentá nuevamente en unos minutos.',
              );
            } else {
              this.error.set('No pudimos cargar los recepcionistas.');
            }
          },
        });
      }

      loadBranches(): void {
        this.branchesLoadError.set(false);

        this.branchService.getAll().subscribe({
          next: (branches) => {
            this.branches.set(branches);
          },
          error: () => {
            this.branches.set([]);
            this.branchesLoadError.set(true);
          },
        });
      }

      clearFilters(): void {
        if (this.actionPending()) return;
        this.statusFilter.set('ALL');
        this.filtersForm.reset({
          firstName: '',
          lastName: '',
          branchExternalId: '',
        });
        this.loadReceptionists();
        this.listHeading()?.nativeElement.focus();
      }

      retryLoad(): void {
        this.loadReceptionists();
        this.listHeading()?.nativeElement.focus();
      }

      updateStatusFilter(event: Event): void {
        this.statusFilter.set((event.target as HTMLSelectElement).value as 'ALL' | 'ACTIVE' | 'INACTIVE');
      }

      reactivateReceptionist(receptionist: ReceptionistResponse): void {
        if (!this.isAdmin() || receptionist.active !== false || this.actionPending()) return;
        if (!window.confirm(`¿Reactivar al recepcionista "${receptionist.firstName} ${receptionist.lastName}"?`)) return;

        this.reactivatingId.set(receptionist.externalId);
        this.reactivateError.set(null);
        this.deleteError.set(null);
        this.success.set(null);
        this.receptionistService.reactivate(receptionist.externalId).subscribe({
          next: (updated) => {
            this.receptionists.update((list) => list.map((item) =>
              item.externalId === receptionist.externalId ? updated : item,
            ));
            this.reactivatingId.set(null);
            this.success.set(`Se reactivó el perfil de recepcionista de ${updated.firstName} ${updated.lastName}.`);
          },
          error: (err) => {
            this.reactivatingId.set(null);
            const message = typeof err?.error?.message === 'string' ? err.error.message.trim() : '';
            if (err?.status === 409) {
              this.reactivateError.set(message || 'No se pudo reactivar el perfil. Puede estar ya activo, o la cuenta asociada estar inactiva, tener credenciales deshabilitadas o presentar una inconsistencia.');
            } else if (err?.status === 404) {
              this.reactivateError.set(message || 'El recepcionista ya no existe.');
            } else if (err?.status === 401) {
              this.reactivateError.set('No tenés autorización para reactivar recepcionistas. Iniciá sesión nuevamente.');
            } else if (err?.status === 403) {
              this.reactivateError.set('No tenés permisos para reactivar recepcionistas.');
            } else {
              this.reactivateError.set('No pudimos reactivar al recepcionista. Intentá nuevamente.');
            }
          },
        });
      }

      deleteReceptionist(receptionist: ReceptionistResponse): void {
        if (!this.isAdmin() || this.actionPending()) {
          return;
        }

        const confirmed = window.confirm(
          `¿Dar de baja al recepcionista "${receptionist.firstName} ${receptionist.lastName}"? Esta acción no se puede deshacer.`,
        );

        if (!confirmed) {
          return;
        }

        this.deletingId.set(receptionist.externalId);
        this.deleteError.set(null);

        this.receptionistService.delete(receptionist.externalId).subscribe({
          next: () => {
            this.deletingId.set(null);
            this.loadReceptionists();
          },
          error: (err) => {
            this.deletingId.set(null);

            if (err?.status === 404) {
              this.deleteError.set('El recepcionista ya no existe.');
            } else if (err?.status === 409) {
              this.deleteError.set('El recepcionista ya está inactivo.');
            } else if (err?.status === 401) {
              this.deleteError.set(
                'No tenés autorización para dar de baja recepcionistas. Iniciá sesión nuevamente.',
              );
            } else if (err?.status === 403) {
              this.deleteError.set('No tenés permisos para dar de baja recepcionistas.');
            } else {
              this.deleteError.set(
                'No pudimos dar de baja al recepcionista. Intentá nuevamente.',
              );
            }
          },
        });
      }
    }
