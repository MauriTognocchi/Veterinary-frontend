import { Component, inject, signal, OnInit } from '@angular/core';
    import { RouterLink } from '@angular/router';
    import { FormsModule } from '@angular/forms';
    import { VisitService } from '../../services/visit';
    import { VisitResponse, VisitFilters } from '../../models/visit.model';
    import { AuthService } from '../../../../core/services/auth';

    @Component({
      selector: 'app-visit-list',
      standalone: true,
      imports: [RouterLink, FormsModule],
      templateUrl: './visit-list.html',
      styleUrl: './visit-list.css',
    })
    export class VisitList implements OnInit {
      private readonly visitService = inject(VisitService);
      private readonly authService = inject(AuthService);

      visits = signal<VisitResponse[]>([]);
      loading = signal(false);
      error = signal<string | null>(null);

      filters: VisitFilters = {};
      walkInFilter: string = '';

      get canCreate(): boolean {
        return this.authService.hasAnyRole(['ROLE_VETERINARIAN']);
      }

      get canEdit(): boolean {
        return this.authService.hasAnyRole(['ROLE_VETERINARIAN']);
      }

      ngOnInit(): void {
        this.load();
      }

      load(): void {
        this.loading.set(true);
        this.error.set(null);

        const filters: VisitFilters = { ...this.filters };
        if (this.walkInFilter === 'true') filters.walkIn = true;
        else if (this.walkInFilter === 'false') filters.walkIn = false;
        else delete filters.walkIn;

        this.visitService.getAll(filters).subscribe({
          next: (data) => {
            this.visits.set(data);
            this.loading.set(false);
          },
          error: () => {
            this.error.set('Error al cargar las visitas.');
            this.loading.set(false);
          },
        });
      }

      clearFilters(): void {
        this.filters = {};
        this.walkInFilter = '';
        this.load();
      }

      formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }

      isWalkIn(visit: VisitResponse): boolean {
        return visit.appointment === null;
      }
    }