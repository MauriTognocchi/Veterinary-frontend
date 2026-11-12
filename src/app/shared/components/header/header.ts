import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ANIMAL_TYPE_ADMIN_ROLES } from '../../../core/models/auth.model';
import { AuthService } from '../../../core/services/auth';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-header',
  styleUrl: './header.css',
  templateUrl: './header.html',
})
export class Header {
  private readonly authService = inject(AuthService);

  readonly isLoggedIn = this.authService.isAuthenticated;
  readonly isAdmin = computed(() =>
    this.authService.hasAnyRole(ANIMAL_TYPE_ADMIN_ROLES),
  );
  readonly canViewOwners = computed(() =>
    this.authService.hasAnyPermission(['VIEW_OWNERS']),
  );
  readonly canCreateOwner = computed(() =>
    this.authService.hasAnyPermission(['CREATE_OWNERS']),
  );
  readonly canViewUsers = computed(() =>
    this.authService.hasAnyPermission(['VIEW_USERS']),
  );
  readonly canViewConditions = computed(() =>
        this.authService.hasAnyPermission(['VIEW_CLINICAL_RECORDS']),
      );

  logout(): void {
    this.authService.logout('manual');
  }
}

