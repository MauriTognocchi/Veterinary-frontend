import { Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BRANCH_ADMIN_ROLES } from '../../../../core/models/auth.model';
import { AuthService } from '../../../../core/services/auth';
import { BranchResponse } from '../../models/branch.model';
import { BranchService } from '../../services/branch';

@Component({
  standalone: true,
  imports: [RouterLink],
  selector: 'app-branch-list',
  styleUrl: './branch-list.css',
  templateUrl: './branch-list.html',
})
export class BranchList implements OnInit {
  private branchService = inject(BranchService);
  private authService = inject(AuthService);
  private listHeading = viewChild<ElementRef<HTMLElement>>('listHeading');

  readonly isAdmin = computed(() =>
    this.authService.hasAnyRole(BRANCH_ADMIN_ROLES),
  );

  branches = signal<BranchResponse[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  loadErrorRetryable = signal<boolean>(false);
  selectedBranchId = signal<string | null>(null);
  deletingId = signal<string | null>(null);
  deleteError = signal<string | null>(null);

  readonly selectedBranch = computed(
    () => this.branches().find((branch) => branch.externalId === this.selectedBranchId()) ?? null,
  );

  ngOnInit(): void {
    this.loadBranches();
  }

  loadBranches(): void {
    this.loading.set(true);
    this.selectedBranchId.set(null);
    this.error.set(null);
    this.loadErrorRetryable.set(false);
    this.branches.set([]);

    this.branchService.getAll().subscribe({
      next: (branches) => {
        this.branches.set(branches);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);

        const status = err?.status;
        const retryable = status === 0 || status === 408 || status === 429 || status >= 500;
        this.loadErrorRetryable.set(retryable);

        if (status === 401) {
          this.error.set(
            'No tenés autorización para ver las sucursales. Iniciá sesión nuevamente.',
          );
        } else if (status === 403) {
          this.error.set('No tenés permisos para ver las sucursales.');
        } else if (status === 404) {
          this.error.set('No encontramos la información solicitada.');
        } else if (status === 0) {
          this.error.set(
            'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
          );
        } else if (status >= 500 || status === 408 || status === 429) {
          this.error.set('No pudimos cargar las sucursales. Intentá nuevamente en unos minutos.');
        } else {
          this.error.set('No pudimos cargar las sucursales.');
        }
      },
    });
  }

  retryLoad(): void {
    this.loadBranches();
    this.listHeading()?.nativeElement.focus();
  }

  selectBranch(branch: BranchResponse): void {
    this.selectedBranchId.set(branch.externalId);
  }

  deleteBranch(branch: BranchResponse): void {
    if (this.deletingId() !== null) {
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar la sucursal "${branch.name}"? Esta acción no se puede deshacer.`,
    );

    if (!confirmed) {
      return;
    }

    this.deletingId.set(branch.externalId);
    this.deleteError.set(null);

    this.branchService.delete(branch.externalId).subscribe({
      next: () => {
        this.branches.update((branches) =>
          branches.filter((item) => item.externalId !== branch.externalId),
        );

        if (this.selectedBranchId() === branch.externalId) {
          this.selectedBranchId.set(null);
        }

        this.deletingId.set(null);
      },
      error: (err) => {
        this.deletingId.set(null);

        if (err?.status === 404) {
          this.deleteError.set('La sucursal ya no existe.');
        } else if (err?.status === 401) {
          this.deleteError.set(
            'No tenés autorización para eliminar sucursales. Iniciá sesión nuevamente.',
          );
        } else if (err?.status === 403) {
          this.deleteError.set('No tenés permisos para eliminar sucursales.');
        } else {
          this.deleteError.set('No pudimos eliminar la sucursal. Intentá nuevamente.');
        }
      },
    });
  }

  formatAddress(branch: BranchResponse): string {
    const address = branch.address;

    if (!address) {
      return 'Sin dirección registrada';
    }

    return `${address.street} ${address.number}, ${address.city}, ${address.province}`;
  }

  formatTime(time: string): string {
    return time ? time.slice(0, 5) : '—';
  }
}
