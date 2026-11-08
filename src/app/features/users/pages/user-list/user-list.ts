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
import {
  UserResponse,
  UserState,
  UserStatusFilter,
} from '../../models/user.model';
import { UserService } from '../../services/user';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './user-list.html',
  styleUrl: './user-list.css',
})
export class UserList implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private listHeading = viewChild<ElementRef<HTMLElement>>('listHeading');

  readonly canDeleteUsers = computed(() =>
    this.authService.hasAnyPermission(['DELETE_USERS']),
  );

  users = signal<UserResponse[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  loadErrorRetryable = signal<boolean>(false);
  searchTerm = signal<string>('');
  statusFilter = signal<UserStatusFilter>('ALL');
  deletingId = signal<string | null>(null);
  deleteError = signal<string | null>(null);
  success = signal<string | null>(null);

  readonly filteredUsers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();

    return this.users().filter((user) => {
      const matchesStatus = status === 'ALL' || user.userState === status;
      const matchesSearch =
        term.length === 0 ||
        user.firstName.toLowerCase().includes(term) ||
        user.lastName.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    });
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.error.set(null);
    this.loadErrorRetryable.set(false);
    this.users.set([]);

    this.userService.getAll().subscribe({
      next: (users) => {
        this.users.set(users);
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
            'No tenés autorización para ver los usuarios. Iniciá sesión nuevamente.',
          );
        } else if (status === 403) {
          this.error.set('No tenés permisos para ver los usuarios.');
        } else if (status === 0) {
          this.error.set(
            'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
          );
        } else if (status >= 500 || status === 408 || status === 429) {
          this.error.set(
            'No pudimos cargar los usuarios. Intentá nuevamente en unos minutos.',
          );
        } else {
          this.error.set('No pudimos cargar los usuarios.');
        }
      },
    });
  }

  retryLoad(): void {
    this.loadUsers();
    this.listHeading()?.nativeElement.focus();
  }

  updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  updateStatusFilter(event: Event): void {
    this.statusFilter.set(
      (event.target as HTMLSelectElement).value as UserStatusFilter,
    );
  }

  deactivateUser(user: UserResponse): void {
    if (
      !this.canDeleteUsers() ||
      user.userState !== 'ACTIVE' ||
      this.deletingId() !== null
    ) {
      return;
    }

    const confirmed = window.confirm(
      `¿Desactivar a ${user.firstName} ${user.lastName}? El usuario quedará inactivo.`,
    );

    if (!confirmed) {
      return;
    }

    this.deletingId.set(user.externalId);
    this.deleteError.set(null);
    this.success.set(null);

    this.userService.deactivate(user.externalId).subscribe({
      next: () => {
        this.users.update((users) =>
          users.map((item) =>
            item.externalId === user.externalId
              ? { ...item, userState: 'INACTIVE' as UserState }
              : item,
          ),
        );
        this.deletingId.set(null);
        this.success.set(
          `${user.firstName} ${user.lastName} quedó inactivo.`,
        );
      },
      error: (err) => {
        this.deletingId.set(null);

        if (err?.status === 404) {
          this.deleteError.set('El usuario ya no existe.');
        } else if (err?.status === 400) {
          this.deleteError.set('El usuario ya estaba inactivo.');
        } else if (err?.status === 401) {
          this.deleteError.set(
            'No tenés autorización para desactivar usuarios. Iniciá sesión nuevamente.',
          );
        } else if (err?.status === 403) {
          this.deleteError.set('No tenés permisos para desactivar usuarios.');
        } else {
          this.deleteError.set(
            'No pudimos desactivar el usuario. Intentá nuevamente.',
          );
        }
      },
    });
  }
}
