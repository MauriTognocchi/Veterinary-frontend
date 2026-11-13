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
  readonly isVeterinarian = computed(() =>
    this.authService.hasAnyRole(['ROLE_VETERINARIAN']),
  );
  readonly isReceptionist = computed(() =>
    this.authService.hasAnyRole(['ROLE_RECEPTIONIST']),
  );

  logout(): void {
    this.authService.logout('manual');
  }
}

