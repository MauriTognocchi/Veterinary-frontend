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
import { OWNER_WRITE_ROLES } from '../../../../core/models/auth.model';
import { AuthService } from '../../../../core/services/auth';
import { OwnerService } from '../../services/owner';
import { OwnerResponse } from '../../models/owner.model';

@Component({
  standalone: true,
  imports: [RouterLink],
  selector: 'app-owner-list',
  styleUrl: './owner-list.css',
  templateUrl: './owner-list.html',
})
export class OwnerList implements OnInit {
  private ownerService = inject(OwnerService);
  private authService = inject(AuthService);
  private listHeading = viewChild<ElementRef<HTMLElement>>('listHeading');

  readonly canCreateOwnerAccount = computed(() =>
    this.authService.hasAnyRole(OWNER_WRITE_ROLES),
  );
  readonly canDeleteOwners = computed(() =>
    this.authService.hasAnyPermission(['DELETE_OWNERS']),
  );

  owners = signal<OwnerResponse[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  loadErrorRetryable = signal<boolean>(false);
  deletingId = signal<string | null>(null);
  deleteError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadOwners();
  }

  loadOwners(): void {
    this.loading.set(true);
    this.error.set(null);
    this.loadErrorRetryable.set(false);
    this.owners.set([]);

    this.ownerService.getAll().subscribe({
      next: (owners) => {
        this.owners.set(owners);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);

        const status = err?.status;
        const retryable =
          status === 0 || status === 408 || status === 429 || status >= 500;
        this.loadErrorRetryable.set(retryable);

        if (status === 401) {
          this.error.set('No tenés autorización para ver los propietarios. Iniciá sesión nuevamente.');
        } else if (status === 403) {
          this.error.set('No tenés permisos para ver los propietarios.');
        } else if (status === 404) {
          this.error.set('No encontramos la información solicitada.');
        } else if (status === 0) {
          this.error.set('No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.');
        } else if (status >= 500 || status === 408 || status === 429) {
          this.error.set('No pudimos cargar los propietarios. Intentá nuevamente en unos minutos.');
        } else {
          this.error.set('No pudimos cargar los propietarios.');
        }
      },
    });
  }

  retryLoad(): void {
    this.loadOwners();
    this.listHeading()?.nativeElement.focus();
  }

  deleteOwner(owner: OwnerResponse): void {
    if (this.deletingId() !== null) {
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar a ${owner.firstName} ${owner.lastName}? Esta acción no se puede deshacer.`,
    );

    if (!confirmed) {
      return;
    }

    this.deletingId.set(owner.externalId);
    this.deleteError.set(null);

    this.ownerService.delete(owner.externalId).subscribe({
      next: () => {
        this.owners.update((owners) =>
          owners.filter((item) => item.externalId !== owner.externalId),
        );
        this.deletingId.set(null);
      },
      error: (err) => {
        this.deletingId.set(null);
        if (err?.status === 404) {
          this.deleteError.set('El propietario ya no existe.');
        } else if (err?.status === 401) {
          this.deleteError.set('No tenés autorización para eliminar propietarios. Iniciá sesión nuevamente.');
        } else if (err?.status === 403) {
          this.deleteError.set('No tenés permisos para eliminar propietarios.');
        } else {
          this.deleteError.set('No pudimos eliminar el propietario. Intentá nuevamente.');
        }
      },
    });
  }
}
