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

  function findAnimalTypesLink(): HTMLAnchorElement | undefined {
    return findNavLink('Tipos de animales');
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

  it('muestra el enlace de tipos de animales solo para administradores', () => {
    authService.hasAnyRole.mockReturnValue(true);

    createComponent();

    expect(findAnimalTypesLink()?.getAttribute('href')).toBe('/animal-types');
  });

  it('oculta el enlace de tipos de animales para usuarios no administradores', () => {
    createComponent();

    expect(findAnimalTypesLink()).toBeUndefined();
  });

  it('muestra Propietarios con VIEW_OWNERS y Agregar Propietario con CREATE_OWNERS', () => {
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
    authService.hasAnyPermission.mockImplementation((permissions: string[]) =>
      permissions.includes('VIEW_OWNERS'),
    );

    createComponent();

    expect(findNavLink('Propietarios')?.getAttribute('href')).toBe('/owners');
    expect(findNavLink('Agregar Propietario')).toBeUndefined();
  });

  it('muestra Agregar Propietario con CREATE_OWNERS aunque no tenga VIEW_OWNERS', () => {
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
    createComponent();

    expect(findNavLink('Propietarios')).toBeUndefined();
    expect(findNavLink('Agregar Propietario')).toBeUndefined();
    expect(findNavLink('Mascotas')).toBeDefined();
    expect(findNavLink('Sucursales')).toBeDefined();
  });

  it('muestra Usuarios con el permiso VIEW_USERS', () => {
    authService.hasAnyPermission.mockReturnValue(true);

    createComponent();

    expect(authService.hasAnyPermission).toHaveBeenCalledWith(['VIEW_USERS']);
    expect(findNavLink('Usuarios')?.getAttribute('href')).toBe('/users');
  });

  it('oculta Usuarios sin el permiso VIEW_USERS', () => {
    createComponent();

    expect(findNavLink('Usuarios')).toBeUndefined();
  });
});
