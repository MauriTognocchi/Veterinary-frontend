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
    logout: ReturnType<typeof vi.fn>;
  };

  function createComponent(): void {
    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function findAnimalTypesLink(): HTMLAnchorElement | undefined {
    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(
      element.querySelectorAll<HTMLAnchorElement>('.main-nav a'),
    );

    return links.find(
      (link) => link.textContent?.trim() === 'Tipos de animales',
    );
  }

  beforeEach(async () => {
    authService = {
      isAuthenticated: signal(false),
      hasAnyRole: vi.fn().mockReturnValue(false),
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
});
