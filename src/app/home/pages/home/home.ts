import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ANIMAL_TYPE_ADMIN_ROLES } from '../../../core/models/auth.model';
import { AuthService } from '../../../core/services/auth';

interface AdminLink {
  readonly label: string;
  readonly path: string;
}

@Component({
  imports: [RouterLink],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {
  private readonly authService = inject(AuthService);

  readonly isAdmin = computed(() =>
    this.authService.hasAnyRole(ANIMAL_TYPE_ADMIN_ROLES),
  );

  readonly gestionLinks: readonly AdminLink[] = [
    { label: 'Propietarios', path: '/owners' },
    { label: 'Mascotas', path: '/pets' },
    { label: 'Visitas', path: '/visits' },
  ];

  readonly personalLinks: readonly AdminLink[] = [
    { label: 'Usuarios', path: '/users' },
    { label: 'Veterinarios', path: '/veterinarians' },
    { label: 'Recepcionistas', path: '/receptionists' },
  ];

  readonly configuracionLinks: readonly AdminLink[] = [
    { label: 'Sucursales', path: '/branches' },
    { label: 'Condiciones', path: '/conditions' },
    { label: 'Estudios', path: '/studies' },
    { label: 'Medicamentos', path: '/medications' },
    { label: 'Tipos de animales', path: '/animal-types' },
    { label: 'Razas', path: '/breeds' },
  ];
}
