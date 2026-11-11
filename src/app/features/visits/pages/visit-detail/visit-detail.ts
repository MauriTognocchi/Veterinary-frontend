import { Component, inject, signal, OnInit } from '@angular/core';
    import { ActivatedRoute, RouterLink } from '@angular/router';
    import { VisitService } from '../../services/visit';
    import { VisitResponse } from '../../models/visit.model';
    import { AuthService } from '../../../../core/services/auth';

    @Component({
      selector: 'app-visit-detail',
      standalone: true,
      imports: [RouterLink],
      templateUrl: './visit-detail.html',
      styleUrl: './visit-detail.css',
    })
    export class VisitDetail implements OnInit {
      private readonly route = inject(ActivatedRoute);
      private readonly visitService = inject(VisitService);
      private readonly authService = inject(AuthService);

      visit = signal<VisitResponse | null>(null);
      loading = signal(false);
      error = signal<string | null>(null);

      get canEdit(): boolean {
        return this.authService.hasAnyRole(['ROLE_VETERINARIAN']);
      }

      ngOnInit(): void {
        const externalId = this.route.snapshot.paramMap.get('externalId')!;
        this.load(externalId);
      }

      private load(externalId: string): void {
        this.loading.set(true);
        this.error.set(null);

        this.visitService.getById(externalId).subscribe({
          next: (data) => {
            this.visit.set(data);
            this.loading.set(false);
          },
          error: () => {
            this.error.set('Error al cargar la visita.');
            this.loading.set(false);
          },
        });
      }

      isWalkIn(): boolean {
        return this.visit()?.appointment === null;
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
    }