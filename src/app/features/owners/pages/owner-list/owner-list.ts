import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
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

  owners = signal<OwnerResponse[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadOwners();
  }

  loadOwners(): void {
    this.loading.set(true);
    this.error.set(null);
    this.owners.set([]);

    this.ownerService.getAll().subscribe({
      next: (owners) => {
        this.owners.set(owners);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 401) {
          this.error.set('No autorizado. Es necesario autenticarse para ver los propietarios.');
        } else if (err?.status === 403) {
          this.error.set('Acceso denegado. No tiene el permiso VIEW_OWNERS para ver los propietarios.');
        } else {
          this.error.set('Error al cargar la lista de propietarios.');
        }
      },
    });
  }
}
