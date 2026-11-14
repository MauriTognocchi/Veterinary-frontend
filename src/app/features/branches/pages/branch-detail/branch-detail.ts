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
import { BRANCH_ADMIN_ROLES } from '../../../../core/models/auth.model';
import { AuthService } from '../../../../core/services/auth';
import { BranchResponse } from '../../models/branch.model';
import { BranchService } from '../../services/branch';

@Component({
  selector: 'app-branch-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './branch-detail.html',
  styleUrl: './branch-detail.css',
})
export class BranchDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private branchService = inject(BranchService);
  private authService = inject(AuthService);
  private detailHeading = viewChild<ElementRef<HTMLElement>>('detailHeading');

  readonly isAdmin = computed(() =>
    BRANCH_ADMIN_ROLES.some((role) => this.authService.roles().includes(role)),
  );

  branch = signal<BranchResponse | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  loadErrorRetryable = signal<boolean>(false);
  notFound = signal<boolean>(false);
  deleting = signal<boolean>(false);
  deleteError = signal<string | null>(null);

  ngOnInit(): void {
    const externalId = this.route.snapshot.paramMap.get('externalId');

    if (!externalId) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }

    this.loadBranch(externalId);
  }

  loadBranch(externalId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.loadErrorRetryable.set(false);
    this.notFound.set(false);
    this.branch.set(null);

    this.branchService.getById(externalId).subscribe({
      next: (branch) => {
        this.branch.set(branch);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);

        const status = err?.status;
        const retryable = status === 0 || status === 408 || status === 429 || status >= 500;
        this.loadErrorRetryable.set(retryable);

        if (status === 404) {
          this.notFound.set(true);
        } else if (status === 401) {
          this.error.set(
            'No tenés autorización para ver esta sucursal. Iniciá sesión nuevamente.',
          );
        } else if (status === 403) {
          this.error.set('No tenés permisos para ver esta sucursal.');
        } else if (status === 0) {
          this.error.set(
            'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
          );
        } else if (status >= 500 || status === 408 || status === 429) {
          this.error.set(
            'No pudimos cargar los datos de la sucursal. Intentá nuevamente en unos minutos.',
          );
        } else {
          this.error.set('No pudimos cargar los datos de la sucursal.');
        }
      },
    });
  }

  retryLoad(): void {
    const externalId =
      this.branch()?.externalId ?? this.route.snapshot.paramMap.get('externalId');

    if (externalId) {
      this.loadBranch(externalId);
      this.detailHeading()?.nativeElement.focus();
    }
  }

  deleteBranch(): void {
    const currentBranch = this.branch();

    if (!currentBranch || this.deleting()) {
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar la sucursal "${currentBranch.name}"? Esta acción no se puede deshacer.`,
    );

    if (!confirmed) {
      return;
    }

    this.deleting.set(true);
    this.deleteError.set(null);

    this.branchService.delete(currentBranch.externalId).subscribe({
      next: () => {
        this.deleting.set(false);
        this.router.navigate(['/branches']);
      },
      error: (err) => {
        this.deleting.set(false);

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

  formatTime(time: string): string {
    return time ? time.slice(0, 5) : '—';
  }
}
