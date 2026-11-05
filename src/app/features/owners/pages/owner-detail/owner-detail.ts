import { Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OwnerService } from '../../services/owner';
import { OwnerResponse } from '../../models/owner.model';

@Component({
  selector: 'app-owner-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './owner-detail.html',
  styleUrl: './owner-detail.css',
})
export class OwnerDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ownerService = inject(OwnerService);
  private detailHeading = viewChild<ElementRef<HTMLElement>>('detailHeading');

  owner = signal<OwnerResponse | null>(null);
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

    this.loadOwner(externalId);
  }

  loadOwner(externalId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.loadErrorRetryable.set(false);
    this.notFound.set(false);
    this.owner.set(null);

    this.ownerService.getById(externalId).subscribe({
      next: (owner) => {
        this.owner.set(owner);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);

        const status = err?.status;
        const retryable =
          status === 0 || status === 408 || status === 429 || status >= 500;
        this.loadErrorRetryable.set(retryable);

        if (status === 404) {
          this.notFound.set(true);
        } else if (status === 401) {
          this.error.set('No tenés autorización para ver este propietario. Iniciá sesión nuevamente.');
        } else if (status === 403) {
          this.error.set('No tenés permisos para ver este propietario.');
        } else if (status === 0) {
          this.error.set('No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.');
        } else if (status >= 500 || status === 408 || status === 429) {
          this.error.set('No pudimos cargar el propietario. Intentá nuevamente en unos minutos.');
        } else {
          this.error.set('No pudimos cargar el propietario.');
        }
      },
    });
  }

  retryLoad(): void {
    const externalId = this.route.snapshot.paramMap.get('externalId');

    if (externalId) {
      this.loadOwner(externalId);
      this.detailHeading()?.nativeElement.focus();
    }
  }

  deleteOwner(): void {
    const owner = this.owner();

    if (!owner || this.deleting()) {
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar a ${owner.firstName} ${owner.lastName}? Esta acción no se puede deshacer.`,
    );

    if (!confirmed) {
      return;
    }

    this.deleting.set(true);
    this.deleteError.set(null);

    this.ownerService.delete(owner.externalId).subscribe({
      next: () => {
        this.deleting.set(false);
        this.router.navigate(['/owners']);
      },
      error: (err) => {
        this.deleting.set(false);
        if (err?.status === 404) {
          this.deleteError.set('El propietario ya no existe.');
        } else if (err?.status === 401) {
          this.deleteError.set(
            'No tenés autorización para eliminar propietarios. Iniciá sesión nuevamente.',
          );
        } else if (err?.status === 403) {
          this.deleteError.set('No tenés permisos para eliminar propietarios.');
        } else {
          this.deleteError.set('No pudimos eliminar el propietario. Intentá nuevamente.');
        }
      },
    });
  }
}
