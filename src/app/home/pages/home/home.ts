import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  imports: [RouterLink],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {
  private readonly authService = inject(AuthService);

  readonly canViewOwners = computed(() =>
    this.authService.hasAnyPermission(['VIEW_OWNERS']),
  );
  readonly canCreateOwner = computed(() =>
    this.authService.hasAnyPermission(['CREATE_OWNERS']),
  );
}
