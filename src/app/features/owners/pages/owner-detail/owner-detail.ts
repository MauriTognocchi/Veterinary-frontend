import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
  private ownerService = inject(OwnerService);

  owner = signal<OwnerResponse | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  notFound = signal<boolean>(false);

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
}
