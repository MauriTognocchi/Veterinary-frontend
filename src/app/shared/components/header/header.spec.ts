import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
        provideRouter([]),
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
    expect(findNavLink('Mascotas')).toBeUndefined();
    expect(findNavLink('Iniciar sesión')).toBeUndefined();
  });

  it('mantiene la navegación completa para usuarios que no son administradores', () => {
    authService.isAuthenticated.set(true);

    createComponent();

    expect(findNavLink('Home')?.getAttribute('href')).toBe('/');
    expect(findNavLink('Mascotas')?.getAttribute('href')).toBe('/pets');
    expect(findNavLink('Turnos')?.getAttribute('href')).toBe('/appointments');
    expect(findNavLink('Cerrar sesión')).toBeDefined();
  });

  it('muestra Propietarios con VIEW_OWNERS y Agregar Propietario con CREATE_OWNERS', () => {
    authService.isAuthenticated.set(true);
    authService.hasAnyPermission.mockImplementation((permissions: string[]) =>
      permissions.includes('VIEW_OWNERS') ||
      permissions.includes('CREATE_OWNERS'),
    );

    createComponent();

    expect(authService.hasAnyPermission).toHaveBeenCalledWith([
      'VIEW_OWNERS',
    ]);
    expect(authService.hasAnyPermission).toHaveBeenCalledWith([
      'CREATE_OWNERS',
    ]);
    expect(findNavLink('Propietarios')?.getAttribute('href')).toBe('/owners');
    expect(findNavLink('Agregar Propietario')?.getAttribute('href')).toBe(
      '/owners/new',
    );
  });

  it('muestra Propietarios con VIEW_OWNERS sin mostrar Agregar Propietario', () => {
    authService.isAuthenticated.set(true);
    authService.hasAnyPermission.mockImplementation((permissions: string[]) =>
      permissions.includes('VIEW_OWNERS'),
    );

    createComponent();

    expect(findNavLink('Propietarios')?.getAttribute('href')).toBe('/owners');
    expect(findNavLink('Agregar Propietario')).toBeUndefined();
  });

  it('muestra Agregar Propietario con CREATE_OWNERS aunque no tenga VIEW_OWNERS', () => {
    authService.isAuthenticated.set(true);
    authService.hasAnyPermission.mockImplementation((permissions: string[]) =>
      permissions.includes('CREATE_OWNERS'),
    );

    createComponent();

    expect(findNavLink('Propietarios')).toBeUndefined();
    expect(findNavLink('Agregar Propietario')?.getAttribute('href')).toBe(
      '/owners/new',
    );
  });

  it('oculta Propietarios sin VIEW_OWNERS ni CREATE_OWNERS', () => {
    authService.isAuthenticated.set(true);

    createComponent();

    expect(findNavLink('Propietarios')).toBeUndefined();
    expect(findNavLink('Agregar Propietario')).toBeUndefined();
    expect(findNavLink('Mascotas')).toBeDefined();
    expect(findNavLink('Sucursales')).toBeDefined();
  });

  it('muestra Usuarios con el permiso VIEW_USERS', () => {
    authService.isAuthenticated.set(true);
    authService.hasAnyPermission.mockReturnValue(true);

    createComponent();

    expect(authService.hasAnyPermission).toHaveBeenCalledWith(['VIEW_USERS']);
    expect(findNavLink('Usuarios')?.getAttribute('href')).toBe('/users');
  });

  it('oculta Usuarios sin el permiso VIEW_USERS', () => {
    authService.isAuthenticated.set(true);

    createComponent();

    expect(findNavLink('Usuarios')).toBeUndefined();
  });

  it('muestra Visitas y Medicamentos según sus permisos', () => {
    authService.isAuthenticated.set(true);
    authService.hasAnyPermission.mockImplementation((permissions: string[]) =>
      permissions.includes('VIEW_CLINICAL_RECORDS') ||
      permissions.includes('VIEW_MEDICATIONS'),
    );

    createComponent();

    expect(findNavLink('Visitas')?.getAttribute('href')).toBe('/visits');
    expect(findNavLink('Medicamentos')?.getAttribute('href')).toBe(
      '/medications',
    );
  });

  it('oculta Visitas y Medicamentos sin sus permisos', () => {
    authService.isAuthenticated.set(true);

    createComponent();

    expect(findNavLink('Visitas')).toBeUndefined();
    expect(findNavLink('Medicamentos')).toBeUndefined();
  });

  it('muestra Cerrar sesión y oculta login cuando hay sesión', () => {
    authService.isAuthenticated.set(true);

    createComponent();

    expect(findNavLink('Cerrar sesión')).toBeDefined();
    expect(findNavLink('Iniciar sesión')).toBeUndefined();
    expect(findNavLink('Registrarse')).toBeUndefined();
  });
});
