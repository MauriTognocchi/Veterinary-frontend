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
import { VETERINARIAN_ADMIN_ROLES } from '../../../../core/models/auth.model';
import { AuthService } from '../../../../core/services/auth';
import {
  VeterinarianResponse,
  VeterinarianWorkDay,
} from '../../models/veterinarian.model';
import { VeterinarianService } from '../../services/veterinarian';

const WEEK_DAY_ORDER: VeterinarianWorkDay[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const DAY_LABELS: Record<VeterinarianWorkDay, string> = {
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
};

@Component({
  selector: 'app-veterinarian-detail',
  standalone: true,
  imports: [RouterLink],
  styleUrl: './veterinarian-detail.css',
  templateUrl: './veterinarian-detail.html',
})
export class VeterinarianDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private veterinarianService = inject(VeterinarianService);
  private authService = inject(AuthService);
  private detailHeading = viewChild<ElementRef<HTMLElement>>('detailHeading');

  readonly isAdmin = computed(() =>
    this.authService.hasAnyRole(VETERINARIAN_ADMIN_ROLES),
  );

  veterinarian = signal<VeterinarianResponse | null>(null);
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

    this.loadVeterinarian(externalId);
  }

  loadVeterinarian(externalId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.loadErrorRetryable.set(false);
    this.notFound.set(false);
    this.veterinarian.set(null);

    this.veterinarianService.getById(externalId).subscribe({
      next: (veterinarian) => {
        this.veterinarian.set(veterinarian);
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
            'No tenés autorización para ver este veterinario. Iniciá sesión nuevamente.',
          );
        } else if (status === 403) {
          this.error.set('No tenés permisos para ver este veterinario.');
        } else if (status === 0) {
          this.error.set(
            'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
          );
        } else if (status >= 500 || status === 408 || status === 429) {
          this.error.set(
            'No pudimos cargar los datos del veterinario. Intentá nuevamente en unos minutos.',
          );
        } else {
          this.error.set('No pudimos cargar los datos del veterinario.');
        }
      },
    });
  }

  retryLoad(): void {
    const externalId =
      this.veterinarian()?.externalId ??
      this.route.snapshot.paramMap.get('externalId');

    if (externalId) {
      this.loadVeterinarian(externalId);
      this.detailHeading()?.nativeElement.focus();
    }
  }

  formatTime(time: string): string {
    return time ? time.slice(0, 5) : '—';
  }

  deleteVeterinarian(): void {
    const currentVeterinarian = this.veterinarian();

    if (!currentVeterinarian || this.deleting()) {
      return;
    }

    const confirmed = window.confirm(
      `¿Dar de baja al veterinario "${currentVeterinarian.firstName} ${currentVeterinarian.lastName}"? Esta acción no se puede deshacer.`,
    );

    if (!confirmed) {
      return;
    }

    this.deleting.set(true);
    this.deleteError.set(null);

    this.veterinarianService.delete(currentVeterinarian.externalId).subscribe({
      next: () => {
        this.deleting.set(false);
        this.router.navigate(['/veterinarians']);
      },
      error: (err) => {
        this.deleting.set(false);

        if (err?.status === 404) {
          this.deleteError.set('El veterinario ya no existe.');
        } else if (err?.status === 409) {
          this.deleteError.set('El veterinario ya está inactivo.');
        } else if (err?.status === 401) {
          this.deleteError.set(
            'No tenés autorización para dar de baja veterinarios. Iniciá sesión nuevamente.',
          );
        } else if (err?.status === 403) {
          this.deleteError.set('No tenés permisos para dar de baja veterinarios.');
        } else {
          this.deleteError.set(
            'No pudimos dar de baja al veterinario. Intentá nuevamente.',
          );
        }
      },
    });
  }

  formatWorkDays(days: VeterinarianWorkDay[] | null): string {
    if (!days || days.length === 0) {
      return '—';
    }

    return [...days]
      .sort((a, b) => WEEK_DAY_ORDER.indexOf(a) - WEEK_DAY_ORDER.indexOf(b))
      .map((day) => DAY_LABELS[day])
      .join(', ');
  }
}
