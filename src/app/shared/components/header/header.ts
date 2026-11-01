import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { TokenStorageService } from '../../../core/services/token-storage.service';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-header',
  styleUrl: './header.css',
  templateUrl: './header.html',
})
export class Header {
  private authService = inject(AuthService);
  private tokenStorage = inject(TokenStorageService);

  isLoggedIn(): boolean{/// se fija si hay un accessToken guardado
    return !!this.tokenStorage.getAccessToken(); /// si existe lo devuelve, sino false
  }

  logOut(): void{ ///metodo para cerrar sesion
    this.authService.logout(); ///llama al logout() del authService (borra tokens yu redirige al login)
  }
}
