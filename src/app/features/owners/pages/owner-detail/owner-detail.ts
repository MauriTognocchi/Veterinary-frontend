import { Component, OnInit, inject, signal } from '@angular/core';
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

  owner = signal<OwnerResponse | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
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
    this.notFound.set(false);
    this.owner.set(null);

    this.ownerService.getById(externalId).subscribe({
      next: (owner) => {
        this.owner.set(owner);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 404) {
          this.notFound.set(true);
        } else if (err?.status === 401) {
          this.error.set('No autorizado. Es necesario autenticarse para ver el propietario.');
        } else if (err?.status === 403) {
          this.error.set('Acceso denegado. No tiene el permiso VIEW_OWNERS para ver el propietario.');
        } else {
          this.error.set('Error al cargar el propietario.');
        }
      },
    });
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
            'No autorizado. Es necesario autenticarse para eliminar propietarios.',
          );
        } else if (err?.status === 403) {
          this.deleteError.set('Acceso denegado. No tiene permisos para eliminar propietarios.');
        } else {
          this.deleteError.set('Error al eliminar el propietario. Intente nuevamente.');
        }
      },
    });
  }
}
