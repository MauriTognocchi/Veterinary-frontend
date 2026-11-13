import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

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
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('se crea correctamente', () => {
    createComponent();

    expect(component).toBeTruthy();
  });

  it('muestra el título y el texto de bienvenida', () => {
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

    expect(findLink('INICIAR SESIÓN')?.getAttribute('href')).toBe('/login');
    expect(findLink('REGISTRARSE')?.getAttribute('href')).toBe('/register');
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
