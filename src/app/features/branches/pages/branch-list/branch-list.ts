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
    BRANCH_ADMIN_ROLES.some((role) => this.authService.roles().includes(role)),
  );

  branches = signal<BranchResponse[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  loadErrorRetryable = signal<boolean>(false);

  ngOnInit(): void {
    this.loadBranches();
  }

  loadBranches(): void {
    this.loading.set(true);
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
