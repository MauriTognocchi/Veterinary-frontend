import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { canNavigateTo } from '../../../core/guards/route-access';
import { AuthService } from '../../../core/services/auth';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-header',
  styleUrl: './header.css',
  templateUrl: './header.html',
})
export class Header {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isLoggedIn = this.authService.isAuthenticated;

  canAccess(path: string): boolean {
    return canNavigateTo(this.authService, this.router, path);
  }

  logout(): void {
    this.authService.logout('manual');
  }
}

