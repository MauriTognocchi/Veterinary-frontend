import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let authService: { hasAnyRole: ReturnType<typeof vi.fn> };

  function createComponent(): void {
    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function findLink(container: string, label: string): HTMLAnchorElement | undefined {
    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(
      element.querySelectorAll<HTMLAnchorElement>(`${container} a`),
    );

    return links.find((link) => {
      const cardLabel = link.querySelector('span')?.textContent?.trim();

      return cardLabel === label || link.textContent?.trim() === label;
    });
  }

  beforeEach(async () => {
    authService = { hasAnyRole: vi.fn().mockReturnValue(false) };

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

  describe('sin sesión de administrador', () => {
    it('muestra el título y el texto de bienvenida pública', () => {
      createComponent();

      const element = fixture.nativeElement as HTMLElement;

      expect(element.querySelector('h2')?.textContent?.trim()).toBe(
        '¡Cuidamos a quienes más querés!',
      );
      expect(element.querySelector('.lead')?.textContent?.trim()).toBe(
        'Gestioná la salud de tus mascotas de manera sencilla y desde cualquier lugar.',
      );
    });

    it('navega a login y registro desde los botones', () => {
      createComponent();

      expect(findLink('.home-actions', 'INICIAR SESIÓN')?.getAttribute('href')).toBe(
        '/login',
      );
      expect(findLink('.home-actions', 'REGISTRARSE')?.getAttribute('href')).toBe(
        '/register',
      );
    });

    it('reserva el espacio para la imagen de perros y gatos', () => {
      createComponent();

      const element = fixture.nativeElement as HTMLElement;
      const media = element.querySelector('.home-media');

      expect(media?.getAttribute('role')).toBe('img');
      expect(media?.getAttribute('aria-label')).toBe(
        'Espacio reservado para una imagen de perros y gatos',
      );
    });
  });

  describe('como administrador', () => {
    beforeEach(() => {
      authService.hasAnyRole.mockReturnValue(true);
    });

    it('muestra el título y el subtítulo del panel', () => {
      createComponent();

      const element = fixture.nativeElement as HTMLElement;

      expect(element.querySelector('.admin-home-header h2')?.textContent?.trim()).toBe(
        '¡Bienvenido, Administrador!',
      );
      expect(element.querySelector('.admin-home-header p')?.textContent?.trim()).toBe(
        'Panel de administración veterinaria.',
      );
      expect(element.querySelector('.home-hero')).toBeNull();
    });

    it('muestra las categorías del panel', () => {
      createComponent();

      const element = fixture.nativeElement as HTMLElement;
      const headings = Array.from(element.querySelectorAll('.admin-category h3')).map(
        (heading) => heading.textContent?.trim(),
      );

      expect(headings).toEqual(['Gestión', 'Personal', 'Configuración', 'Acciones']);
    });

    it('navega a cada sección desde sus tarjetas', () => {
      createComponent();

      const expectedLinks: ReadonlyArray<[string, string]> = [
        ['Propietarios', '/owners'],
        ['Mascotas', '/pets'],
        ['Visitas', '/visits'],
        ['Usuarios', '/users'],
        ['Veterinarios', '/veterinarians'],
        ['Recepcionistas', '/receptionists'],
        ['Sucursales', '/branches'],
        ['Condiciones', '/conditions'],
        ['Estudios', '/studies'],
        ['Medicamentos', '/medications'],
        ['Tipos de animales', '/animal-types'],
        ['Razas', '/breeds'],
      ];

      for (const [label, path] of expectedLinks) {
        expect(findLink('.admin-home', label)?.getAttribute('href')).toBe(path);
      }
    });

    it('navega a los formularios desde las acciones', () => {
      createComponent();

      expect(
        findLink('.admin-actions', 'Registrar usuario')?.getAttribute('href'),
      ).toBe('/users/new');
      expect(
        findLink('.admin-actions', 'Agregar propietario')?.getAttribute('href'),
      ).toBe('/owners/new');
    });
  });
});
