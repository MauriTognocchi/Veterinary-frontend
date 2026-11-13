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
import { VETERINARIAN_ADMIN_ROLES } from '../../../../core/models/auth.model';
import { AuthService } from '../../../../core/services/auth';
import { BranchResponse } from '../../../branches/models/branch.model';
import { BranchService } from '../../../branches/services/branch';
import {
  VeterinarianFilters,
  VeterinarianResponse,
} from '../../models/veterinarian.model';
import { VeterinarianService } from '../../services/veterinarian';

@Component({
  selector: 'app-veterinarian-list',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  styleUrl: './veterinarian-list.css',
  templateUrl: './veterinarian-list.html',
})
export class VeterinarianList implements OnInit {
  private fb = inject(FormBuilder);
  private veterinarianService = inject(VeterinarianService);
  private branchService = inject(BranchService);
  private authService = inject(AuthService);
  private listHeading = viewChild<ElementRef<HTMLElement>>('listHeading');

  readonly isAdmin = computed(() =>
    this.authService.hasAnyRole(VETERINARIAN_ADMIN_ROLES),
  );

  veterinarians = signal<VeterinarianResponse[]>([]);
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
  readonly filteredVeterinarians = computed(() => this.veterinarians().filter((vet) =>
    this.statusFilter() === 'ALL' || vet.active === (this.statusFilter() === 'ACTIVE'),
  ));

  filtersForm = this.fb.nonNullable.group({
    firstName: [''],
    lastName: [''],
    licenseNumber: [''],
    branchExternalId: [''],
  });

  ngOnInit(): void {
    this.loadVeterinarians();
    this.loadBranches();
  }

  loadVeterinarians(): void {
    if (this.actionPending()) return;
    this.loading.set(true);
    this.error.set(null);
    this.loadErrorRetryable.set(false);
    this.veterinarians.set([]);

    const raw = this.filtersForm.getRawValue();
    const filters: VeterinarianFilters = {
      firstName: raw.firstName,
      lastName: raw.lastName,
      licenseNumber: raw.licenseNumber,
      branchExternalId: raw.branchExternalId,
    };

    this.appliedFilters.set(
      Boolean(
        filters.firstName?.trim() ||
          filters.lastName?.trim() ||
          filters.licenseNumber?.trim() ||
          filters.branchExternalId?.trim(),
      ),
    );

    this.veterinarianService.getAll(filters).subscribe({
      next: (veterinarians) => {
        this.veterinarians.set(veterinarians);
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
            'No tenés autorización para ver los veterinarios. Iniciá sesión nuevamente.',
          );
        } else if (status === 403) {
          this.error.set('No tenés permisos para ver los veterinarios.');
        } else if (status === 404) {
          this.error.set('No encontramos la información solicitada.');
        } else if (status === 0) {
          this.error.set(
            'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
          );
        } else if (status >= 500 || status === 408 || status === 429) {
          this.error.set(
            'No pudimos cargar los veterinarios. Intentá nuevamente en unos minutos.',
          );
        } else {
          this.error.set('No pudimos cargar los veterinarios.');
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
      licenseNumber: '',
      branchExternalId: '',
    });
    this.loadVeterinarians();
    this.listHeading()?.nativeElement.focus();
  }

  retryLoad(): void {
    this.loadVeterinarians();
    this.listHeading()?.nativeElement.focus();
  }

  updateStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as 'ALL' | 'ACTIVE' | 'INACTIVE');
  }

  reactivateVeterinarian(veterinarian: VeterinarianResponse): void {
    if (!this.isAdmin() || veterinarian.active !== false || this.actionPending()) return;
    if (!window.confirm(`¿Reactivar al veterinario "${veterinarian.firstName} ${veterinarian.lastName}"?`)) return;

    this.reactivatingId.set(veterinarian.externalId);
    this.reactivateError.set(null);
    this.deleteError.set(null);
    this.success.set(null);
    this.veterinarianService.reactivate(veterinarian.externalId).subscribe({
      next: (updated) => {
        this.veterinarians.update((list) => list.map((item) =>
          item.externalId === veterinarian.externalId ? updated : item,
        ));
        this.reactivatingId.set(null);
        this.success.set(`Se reactivó el perfil veterinario de ${updated.firstName} ${updated.lastName}.`);
      },
      error: (err) => {
        this.reactivatingId.set(null);
        const message = typeof err?.error?.message === 'string' ? err.error.message.trim() : '';
        if (err?.status === 409) {
          this.reactivateError.set(message || 'No se pudo reactivar el perfil. Puede estar ya activo, o la cuenta asociada estar inactiva, tener credenciales deshabilitadas o presentar una inconsistencia.');
        } else if (err?.status === 404) {
          this.reactivateError.set(message || 'El veterinario ya no existe.');
        } else if (err?.status === 401) {
          this.reactivateError.set('No tenés autorización para reactivar veterinarios. Iniciá sesión nuevamente.');
        } else if (err?.status === 403) {
          this.reactivateError.set('No tenés permisos para reactivar veterinarios.');
        } else {
          this.reactivateError.set('No pudimos reactivar al veterinario. Intentá nuevamente.');
        }
      },
    });
  }

  deleteVeterinarian(veterinarian: VeterinarianResponse): void {
    if (this.actionPending()) {
      return;
    }

    const confirmed = window.confirm(
      `¿Dar de baja al veterinario "${veterinarian.firstName} ${veterinarian.lastName}"? Esta acción no se puede deshacer.`,
    );

    if (!confirmed) {
      return;
    }

    this.deletingId.set(veterinarian.externalId);
    this.deleteError.set(null);

    this.veterinarianService.delete(veterinarian.externalId).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.loadVeterinarians();
      },
      error: (err) => {
        this.deletingId.set(null);

        if (err?.status === 404) {
          this.deleteError.set('El veterinario ya no existe.');
        } else if (err?.status === 409) {
          this.deleteError.set('El veterinario ya está inactivo.');
        } else if (err?.status === 401) {
          this.deleteError.set(
            'No tenés autorización para dar de baja veterinarios. Iniciá sesión nuevamente.',
          );
        } else if (err?.status === 403) {
          this.deleteError.set('No tenés permisos para dar de baja veterinarios.');
        } else {
          this.deleteError.set(
            'No pudimos dar de baja al veterinario. Intentá nuevamente.',
          );
        }
      },
    });
  }
}
