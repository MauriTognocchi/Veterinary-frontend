import {
  Component,
  ElementRef,
  OnInit,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { UserResponse } from '../../models/user.model';
import { UserService } from '../../services/user';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './user-detail.html',
  styleUrl: './user-detail.css',
})
export class UserDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private userService = inject(UserService);
  private detailHeading = viewChild<ElementRef<HTMLElement>>('detailHeading');

  user = signal<UserResponse | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  loadErrorRetryable = signal<boolean>(false);
  notFound = signal<boolean>(false);

  ngOnInit(): void {
    const externalId = this.route.snapshot.paramMap.get('externalId');

    if (!externalId) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }

    this.loadUser(externalId);
  }

  loadUser(externalId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.loadErrorRetryable.set(false);
    this.notFound.set(false);
    this.user.set(null);

    this.userService.getById(externalId).subscribe({
      next: (user) => {
        this.user.set(user);
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
            'No tenés autorización para ver este usuario. Iniciá sesión nuevamente.',
          );
        } else if (status === 403) {
          this.error.set('No tenés permisos para ver este usuario.');
        } else if (status === 0) {
          this.error.set(
            'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
          );
        } else if (status >= 500 || status === 408 || status === 429) {
          this.error.set(
            'No pudimos cargar los datos del usuario. Intentá nuevamente en unos minutos.',
          );
        } else {
          this.error.set('No pudimos cargar los datos del usuario.');
        }
      },
    });
  }

  retryLoad(): void {
    const externalId =
      this.user()?.externalId ?? this.route.snapshot.paramMap.get('externalId');

    if (externalId) {
      this.loadUser(externalId);
      this.detailHeading()?.nativeElement.focus();
    }
  }
}
