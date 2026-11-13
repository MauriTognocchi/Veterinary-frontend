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
    import { RECEPTIONIST_ADMIN_ROLES } from '../../../../core/models/auth.model';
    import { AuthService } from '../../../../core/services/auth';
    import { ReceptionistResponse } from '../../models/receptionist.model';
    import { ReceptionistService } from '../../services/receptionist';

    @Component({
      selector: 'app-receptionist-detail',
      standalone: true,
      imports: [RouterLink],
      styleUrl: './receptionist-detail.css',
      templateUrl: './receptionist-detail.html',
    })
    export class ReceptionistDetail implements OnInit {
      private route = inject(ActivatedRoute);
      private router = inject(Router);
      private receptionistService = inject(ReceptionistService);
      private authService = inject(AuthService);
      private detailHeading = viewChild<ElementRef<HTMLElement>>('detailHeading');

      readonly isAdmin = computed(() =>
        this.authService.hasAnyRole(RECEPTIONIST_ADMIN_ROLES),
      );

      canViewProfile(receptionist: ReceptionistResponse): boolean {
        return this.isAdmin() ||
          (this.authService.hasRole('ROLE_RECEPTIONIST') && typeof receptionist.active === 'boolean');
      }

      receptionist = signal<ReceptionistResponse | null>(null);
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

        this.loadReceptionist(externalId);
      }

      loadReceptionist(externalId: string): void {
        this.loading.set(true);
        this.error.set(null);
        this.loadErrorRetryable.set(false);
        this.notFound.set(false);
        this.receptionist.set(null);

        this.receptionistService.getById(externalId).subscribe({
          next: (receptionist) => {
            this.receptionist.set(receptionist);
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
              this.error.set(
                'No tenés autorización para ver este recepcionista. Iniciá sesión nuevamente.',
              );
            } else if (status === 403) {
              this.error.set('No tenés permisos para ver este recepcionista.');
            } else if (status === 0) {
              this.error.set(
                'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
              );
            } else if (status >= 500 || status === 408 || status === 429) {
              this.error.set(
                'No pudimos cargar los datos del recepcionista. Intentá nuevamente en unos minutos.',
              );
            } else {
              this.error.set('No pudimos cargar los datos del recepcionista.');
            }
          },
        });
      }

      retryLoad(): void {
        const externalId =
          this.receptionist()?.externalId ??
          this.route.snapshot.paramMap.get('externalId');

        if (externalId) {
          this.loadReceptionist(externalId);
          this.detailHeading()?.nativeElement.focus();
        }
      }

      deleteReceptionist(): void {
        const current = this.receptionist();

        if (!this.isAdmin() || !current || this.deleting()) {
          return;
        }

        const confirmed = window.confirm(
          `¿Dar de baja al recepcionista "${current.firstName} ${current.lastName}"? Esta acción no se puede deshacer.`,
        );

        if (!confirmed) {
          return;
        }

        this.deleting.set(true);
        this.deleteError.set(null);

        this.receptionistService.delete(current.externalId).subscribe({
          next: () => {
            this.deleting.set(false);
            this.router.navigate(['/receptionists']);
          },
          error: (err) => {
            this.deleting.set(false);

            if (err?.status === 404) {
              this.deleteError.set('El recepcionista ya no existe.');
            } else if (err?.status === 409) {
              this.deleteError.set('El recepcionista ya está inactivo.');
            } else if (err?.status === 401) {
              this.deleteError.set(
                'No tenés autorización para dar de baja recepcionistas. Iniciá sesión nuevamente.',
              );
            } else if (err?.status === 403) {
              this.deleteError.set('No tenés permisos para dar de baja recepcionistas.');
            } else {
              this.deleteError.set(
                'No pudimos dar de baja al recepcionista. Intentá nuevamente.',
              );
            }
          },
        });
      }
    }
