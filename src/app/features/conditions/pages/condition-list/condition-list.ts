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
    import { AuthService } from '../../../../core/services/auth';
    import { ConditionResponse } from '../../models/condition.model';
    import { ConditionService } from '../../services/condition';
    
    @Component({
      standalone: true,
      imports: [RouterLink],
      selector: 'app-condition-list',
      styleUrl: './condition-list.css',
      templateUrl: './condition-list.html',
    })
    export class ConditionList implements OnInit {
      private conditionService = inject(ConditionService);
      private authService = inject(AuthService);
      private listHeading = viewChild<ElementRef<HTMLElement>>('listHeading');
    
      readonly isAdmin = computed(() => this.authService.hasRole('ROLE_ADMIN'));
      readonly canCreate = computed(() =>
        this.authService.hasAnyPermission(['CREATE_CLINICAL_RECORDS']),
      );
      readonly canEdit = computed(() =>
        this.authService.hasAnyPermission(['UPDATE_CLINICAL_RECORDS']),
      );
    
      conditions = signal<ConditionResponse[]>([]);
      loading = signal<boolean>(true);
      error = signal<string | null>(null);
      loadErrorRetryable = signal<boolean>(false);
      deletingId = signal<string | null>(null);
      deleteError = signal<string | null>(null);
    
      ngOnInit(): void {
        this.loadConditions();
      }
    
      loadConditions(): void {
        this.loading.set(true);
        this.error.set(null);
        this.loadErrorRetryable.set(false);
        this.conditions.set([]);
    
        this.conditionService.getAll().subscribe({
          next: (conditions) => {
            this.conditions.set(conditions);
            this.loading.set(false);
          },
          error: (err) => {
            this.loading.set(false);
            const status = err?.status;
            const retryable =
              status === 0 || status === 408 || status === 429 || status >= 500;
            this.loadErrorRetryable.set(retryable);
    
            if (status === 401) {
              this.error.set(
                'No tenés autorización para ver las condiciones médicas. Iniciá sesión nuevamente.',
              );
            } else if (status === 403) {
              this.error.set('No tenés permisos para ver las condiciones médicas.');
            } else if (status === 0) {
              this.error.set(
                'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
              );
            } else {
              this.error.set('No pudimos cargar las condiciones médicas.');
            }
          },
        });
      }
    
      retryLoad(): void {
        this.loadConditions();
        this.listHeading()?.nativeElement.focus();
      }
    
      deleteCondition(condition: ConditionResponse): void {
        if (this.deletingId() !== null) {
          return;
        }
    
        const confirmed = window.confirm(
          `¿Eliminar la condición médica "${condition.name}"? Esta acción no se puede deshacer.`,
        );
    
        if (!confirmed) {
          return;
        }
    
        this.deletingId.set(condition.externalId);
        this.deleteError.set(null);
    
        this.conditionService.delete(condition.externalId).subscribe({
          next: () => {
            this.conditions.update((items) =>
              items.filter((item) => item.externalId !== condition.externalId),
            );
            this.deletingId.set(null);
          },
          error: (err) => {
            this.deletingId.set(null);
            if (err?.status === 403) {
              this.deleteError.set(
                'Solo los administradores pueden eliminar condiciones médicas.',
              );
            } else {
              this.deleteError.set(
                'Ocurrió un error al intentar eliminar la condición médica.',
              );
            }
          },
        });
      }
    }