import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { routes } from '../../../app.routes';
import { AuthService } from '../../../core/services/auth';
import { Header } from './header';

describe('Header', () => {
  let fixture: ComponentFixture<Header>;
  let component: Header;
  let authService: {
    isAuthenticated: WritableSignal<boolean>;
    hasAnyRole: ReturnType<typeof vi.fn>;
    hasAnyPermission: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };

  function createComponent(): void {
    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function findNavLink(label: string): HTMLAnchorElement | undefined {
    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(
      element.querySelectorAll<HTMLAnchorElement>('.main-nav a'),
    );

    return links.find((link) => link.textContent?.trim() === label);
  }

  beforeEach(async () => {
    authService = {
      isAuthenticated: signal(false),
      hasAnyRole: vi.fn().mockReturnValue(false),
      hasAnyPermission: vi.fn().mockReturnValue(false),
      logout: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        provideRouter(routes),
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();
  });

  it('se crea correctamente', () => {
    createComponent();

    expect(component).toBeTruthy();
  });

  it('muestra la navegación pública sin sesión', () => {
    createComponent();

    expect(findNavLink('Home')?.getAttribute('href')).toBe('/');
    expect(findNavLink('Iniciar sesión')?.getAttribute('href')).toBe('/login');
    expect(findNavLink('Registrarse')?.getAttribute('href')).toBe('/register');
    expect(findNavLink('Mascotas')).toBeUndefined();
    expect(findNavLink('Sucursales')).toBeUndefined();
  });

  it('muestra la navegación del administrador', () => {
    authService.isAuthenticated.set(true);
    authService.hasAnyRole.mockReturnValue(true);

    createComponent();

    expect(findNavLink('Home')?.getAttribute('href')).toBe('/');
    expect(findNavLink('Turnos')?.getAttribute('href')).toBe('/appointments');
    expect(findNavLink('Cerrar sesión')).toBeDefined();
    expect(findNavLink('Mascotas')?.getAttribute('href')).toBe('/pets');
    expect(findNavLink('Iniciar sesión')).toBeUndefined();
  });

  it('muestra la navegación del veterinario', () => {
    authService.isAuthenticated.set(true);
    authService.hasAnyRole.mockImplementation((roles: string[]) =>
      roles.includes('ROLE_VETERINARIAN'),
    );
    authService.hasAnyPermission.mockImplementation((permissions: string[]) =>
      permissions.includes('VIEW_CLINICAL_RECORDS'),
    );

    createComponent();

    expect(findNavLink('Home')?.getAttribute('href')).toBe('/');
    expect(findNavLink('Turnos')?.getAttribute('href')).toBe('/appointments');
    expect(findNavLink('Visitas')?.getAttribute('href')).toBe('/visits');
    expect(findNavLink('Cerrar sesión')).toBeDefined();
    expect(findNavLink('Mascotas')?.getAttribute('href')).toBe('/pets');
    expect(findNavLink('Propietarios')?.getAttribute('href')).toBe('/owners');
    expect(findNavLink('Iniciar sesión')).toBeUndefined();
  });

  it('muestra la navegación del propietario', () => {
    authService.isAuthenticated.set(true);
    authService.hasAnyRole.mockImplementation((roles: string[]) =>
      roles.includes('ROLE_CLIENT'),
    );
    authService.hasAnyPermission.mockImplementation((permissions: string[]) =>
      permissions.includes('VIEW_CLINICAL_RECORDS') || permissions.includes('VIEW_BRANCHES'),
    );

    createComponent();

    expect(findNavLink('Home')?.getAttribute('href')).toBe('/');
    expect(findNavLink('Mascotas')?.getAttribute('href')).toBe('/pets');
    expect(findNavLink('Turnos')?.getAttribute('href')).toBe('/appointments');
    expect(findNavLink('Visitas')?.getAttribute('href')).toBe('/visits');
    expect(findNavLink('Sucursales')?.getAttribute('href')).toBe('/branches');
    expect(findNavLink('Cerrar sesión')).toBeDefined();
    expect(findNavLink('Propietarios')).toBeUndefined();
    expect(findNavLink('Veterinarios')).toBeUndefined();
    expect(findNavLink('Recepcionistas')).toBeUndefined();
    expect(findNavLink('Usuarios')).toBeUndefined();
    expect(findNavLink('Condiciones')).toBeUndefined();
    expect(findNavLink('Estudios')).toBeUndefined();
    expect(findNavLink('Medicamentos')).toBeUndefined();
  });

  it('cierra sesión con el mecanismo existente desde la navegación del propietario', () => {
    authService.isAuthenticated.set(true);
    authService.hasAnyRole.mockImplementation((roles: string[]) =>
      roles.includes('ROLE_CLIENT'),
    );

    createComponent();

    const logoutLink = findNavLink('Cerrar sesión');

    logoutLink?.dispatchEvent(new MouseEvent('click'));

    expect(authService.logout).toHaveBeenCalledWith('manual');
  });

  it('muestra Cerrar sesión y oculta login cuando hay sesión', () => {
    authService.isAuthenticated.set(true);

    createComponent();

    expect(findNavLink('Cerrar sesión')).toBeDefined();
    expect(findNavLink('Iniciar sesión')).toBeUndefined();
    expect(findNavLink('Registrarse')).toBeUndefined();
    authService.isAuthenticated.set(false);
    fixture.detectChanges();
    expect(findNavLink('Cerrar sesión')).toBeUndefined();
    expect(findNavLink('Iniciar sesión')).toBeDefined();
  });

  it('no infiere CLIENT ni muestra enlaces sin permisos con sesión válida sin roles', () => {
    authService.isAuthenticated.set(true);
    createComponent();
    expect(findNavLink('Cerrar sesión')).toBeDefined();
    for (const label of ['Mascotas', 'Turnos', 'Visitas', 'Sucursales', 'Propietarios']) {
      expect(findNavLink(label)).toBeUndefined();
    }
    expect(findNavLink('Iniciar sesión')).toBeUndefined();
    expect(findNavLink('Registrarse')).toBeUndefined();
  });

  it('conserva solamente enlaces autorizados para roles y permisos vigentes', () => {
    authService.isAuthenticated.set(true);
    authService.hasAnyRole.mockImplementation((roles: string[]) => roles.includes('ROLE_RECEPTIONIST'));
    createComponent();
    expect(findNavLink('Turnos')).toBeDefined();
    expect(findNavLink('Propietarios')).toBeDefined();
    expect(findNavLink('Mascotas')).toBeDefined();
    expect(findNavLink('Visitas')).toBeUndefined();
    expect(findNavLink('Sucursales')).toBeUndefined();

    authService.hasAnyPermission.mockImplementation((permissions: string[]) =>
      permissions.includes('VIEW_CLINICAL_RECORDS'),
    );
    authService.isAuthenticated.set(false);
    authService.isAuthenticated.set(true);
    fixture.detectChanges();
    expect(findNavLink('Visitas')).toBeDefined();
    expect(findNavLink('Sucursales')).toBeUndefined();
  });
});
