import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let authService: { hasAnyPermission: ReturnType<typeof vi.fn> };

  function createComponent(): void {
    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function findLink(label: string): HTMLAnchorElement | undefined {
    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(
      element.querySelectorAll<HTMLAnchorElement>('.home-actions a'),
    );

    return links.find((link) => link.textContent?.trim() === label);
  }

  beforeEach(async () => {
    authService = { hasAnyPermission: vi.fn().mockReturnValue(false) };

    await TestBed.configureTestingModule({
      imports: [Home],
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

  it('muestra las acciones de propietarios con VIEW_OWNERS y CREATE_OWNERS', () => {
    authService.hasAnyPermission.mockImplementation((permissions: string[]) =>
      permissions.includes('VIEW_OWNERS') ||
      permissions.includes('CREATE_OWNERS'),
    );

    createComponent();

    expect(findLink('Ver propietarios')?.getAttribute('href')).toBe('/owners');
    expect(findLink('Nuevo propietario')?.getAttribute('href')).toBe(
      '/owners/new',
    );
  });

  it('muestra solo Ver propietarios con VIEW_OWNERS', () => {
    authService.hasAnyPermission.mockImplementation((permissions: string[]) =>
      permissions.includes('VIEW_OWNERS'),
    );

    createComponent();

    expect(findLink('Ver propietarios')?.getAttribute('href')).toBe('/owners');
    expect(findLink('Nuevo propietario')).toBeUndefined();
  });

  it('muestra solo Nuevo propietario con CREATE_OWNERS', () => {
    authService.hasAnyPermission.mockImplementation((permissions: string[]) =>
      permissions.includes('CREATE_OWNERS'),
    );

    createComponent();

    expect(findLink('Ver propietarios')).toBeUndefined();
    expect(findLink('Nuevo propietario')?.getAttribute('href')).toBe(
      '/owners/new',
    );
  });

  it('oculta el bloque de acciones sin permisos de propietarios', () => {
    createComponent();

    expect(fixture.nativeElement.querySelector('.home-actions')).toBeNull();
  });
});
