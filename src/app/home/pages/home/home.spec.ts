import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { routes } from '../../../app.routes';
import { AuthService } from '../../../core/services/auth';
import { AppointmentService } from '../../../features/appointments/services/appointment';
import { OwnerByPetService } from '../../../features/owners-by-pets/services/owner-by-pet';
import { PetService } from '../../../features/pets/services/pet';
import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let authService: {
    isAuthenticated: ReturnType<typeof signal<boolean>>;
    hasAnyRole: ReturnType<typeof vi.fn>;
    hasAnyPermission: ReturnType<typeof vi.fn>;
    ensureSession: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  let appointmentService: { getAll: ReturnType<typeof vi.fn> };
  let ownerByPetService: { getAll: ReturnType<typeof vi.fn> };
  let petService: { getMyPets: ReturnType<typeof vi.fn> };

  function todayKey(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  function vetRoleOnly(roles: readonly string[]): boolean {
    return roles.includes('ROLE_VETERINARIAN');
  }

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
    authService = {
      isAuthenticated: signal(false),
      hasAnyRole: vi.fn().mockReturnValue(false),
      hasAnyPermission: vi.fn().mockReturnValue(false),
      ensureSession: vi.fn().mockReturnValue(of(true)),
      logout: vi.fn(),
    };
    appointmentService = { getAll: vi.fn().mockReturnValue(of([])) };
    ownerByPetService = { getAll: vi.fn().mockReturnValue(of([])) };
    petService = { getMyPets: vi.fn().mockReturnValue(of([])) };

    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter(routes),
        { provide: AuthService, useValue: authService },
        { provide: AppointmentService, useValue: appointmentService },
        { provide: OwnerByPetService, useValue: ownerByPetService },
        { provide: PetService, useValue: petService },
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

  describe('sesión sin rol profesional', () => {
    beforeEach(() => authService.isAuthenticated.set(true));

    it('sin permisos de gestión no muestra login ni enlaces de gestión y ofrece cerrar sesión', () => {
      createComponent();
      const element = fixture.nativeElement as HTMLElement;
      expect(element.textContent).toContain('Tu cuenta no tiene acceso a las secciones de gestión. Contactá al administrador');
      expect(findLink('.home-actions', 'INICIAR SESIÓN')).toBeUndefined();
      expect(findLink('.home-actions', 'REGISTRARSE')).toBeUndefined();
      expect(element.querySelector('.limited-home a')).toBeNull();
      (element.querySelector('.limited-home button') as HTMLButtonElement).click();
      expect(authService.logout).toHaveBeenCalledWith('manual');
      expect(appointmentService.getAll).not.toHaveBeenCalled();
      expect(petService.getMyPets).not.toHaveBeenCalled();
    });

    it('una navegación real hacia Visitas termina en forbidden por el guard, sin llamar al backend', async () => {
      createComponent();
      const router = TestBed.inject(Router);
      await router.navigateByUrl('/visits');
      expect(router.url).toBe('/forbidden?returnUrl=%2Fvisits');
      expect(authService.ensureSession).toHaveBeenCalled();
      expect(appointmentService.getAll).not.toHaveBeenCalled();
    });

    it('con permiso de ruta pero sin rol profesional muestra solo la sección permitida', () => {
      authService.hasAnyPermission.mockImplementation((permissions: readonly string[]) =>
        permissions.includes('VIEW_BRANCHES'),
      );
      createComponent();
      expect(findLink('.limited-home', 'Sucursales')?.getAttribute('href')).toBe('/branches');
      expect(findLink('.limited-home', 'Visitas')).toBeUndefined();
      expect(findLink('.home-actions', 'INICIAR SESIÓN')).toBeUndefined();
    });

    it('mantiene la vista CLIENT si ese rol todavía existe, sin inventar VETERINARIAN', () => {
      authService.hasAnyRole.mockImplementation((roles: readonly string[]) => roles.includes('ROLE_CLIENT'));
      createComponent();
      expect(fixture.nativeElement.querySelector('.owner-home')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.vet-home')).toBeNull();
      expect(findLink('.home-actions', 'INICIAR SESIÓN')).toBeUndefined();
    });
  });

  describe('como administrador', () => {
    beforeEach(() => {
      authService.isAuthenticated.set(true);
      authService.hasAnyRole.mockReturnValue(true);
      authService.hasAnyPermission.mockReturnValue(true);
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
      ).toBe('/owners/new/account');
    });
  });

  describe('como veterinario', () => {
    beforeEach(() => {
      authService.isAuthenticated.set(true);
      authService.hasAnyRole.mockImplementation(vetRoleOnly);
      authService.hasAnyPermission.mockImplementation((permissions: readonly string[]) =>
        permissions.includes('VIEW_CLINICAL_RECORDS'),
      );
    });

    it('muestra el título y el subtítulo del home', () => {
      createComponent();

      const element = fixture.nativeElement as HTMLElement;

      expect(element.querySelector('.vet-home-header h2')?.textContent?.trim()).toBe(
        '¡Buen día, Dr./Dra.!',
      );
      expect(element.querySelector('.vet-home-header p')?.textContent?.trim()).toBe(
        'Estos son los turnos programados para hoy',
      );
    });

    it('consulta los turnos del día actual', () => {
      createComponent();

      expect(appointmentService.getAll).toHaveBeenCalledWith({
        dateFrom: todayKey(),
        dateTo: todayKey(),
      });
    });

    it('muestra únicamente los turnos de hoy con sus datos y la acción Ver', () => {
      const today = todayKey();
      appointmentService.getAll.mockReturnValue(
        of([
          {
            externalId: 'appointment-today',
            appointmentDate: `${today}T09:30:00`,
            status: 'CONFIRMED',
            pet: { externalId: 'pet-1', name: 'Firulais' },
          },
          {
            externalId: 'appointment-other-day',
            appointmentDate: '2000-01-01T10:00:00',
            status: 'PENDING',
            pet: { externalId: 'pet-2', name: 'Michi' },
          },
        ]),
      );
      ownerByPetService.getAll.mockReturnValue(
        of([
          {
            externalId: 'relation-1',
            pet: { externalId: 'pet-1' },
            owner: { firstName: 'Juan', lastName: 'Pérez' },
          },
        ]),
      );

      createComponent();

      const element = fixture.nativeElement as HTMLElement;
      const rows = Array.from(
        element.querySelectorAll<HTMLTableRowElement>('.vet-appointments-table tbody tr'),
      );

      expect(rows).toHaveLength(1);
      expect(rows[0]?.textContent).toContain('09:30');
      expect(rows[0]?.textContent).toContain('Firulais');
      expect(rows[0]?.textContent).toContain('Juan Pérez');
      expect(rows[0]?.textContent).toContain('Confirmado');
      // La edición de turnos exige ADMIN o RECEPTIONIST; no ofrecerla al veterinario.
      expect(rows[0]?.querySelector('a')).toBeNull();
    });

    it('muestra el mensaje vacío cuando no hay turnos para hoy', () => {
      createComponent();

      const element = fixture.nativeElement as HTMLElement;

      expect(element.querySelector('.vet-section')?.textContent).toContain(
        'No hay turnos programados para hoy',
      );
    });

    it('navega a las secciones desde los accesos rápidos', () => {
      createComponent();

      expect(findLink('.quick-access-grid', 'BUSCAR MASCOTA')?.getAttribute('href')).toBe(
        '/pets',
      );
      expect(
        findLink('.quick-access-grid', 'BUSCAR PROPIETARIO')?.getAttribute('href'),
      ).toBe('/owners');
      expect(
        findLink('.quick-access-grid', 'HISTORIAL DE VISITAS')?.getAttribute('href'),
      ).toBe('/visits');
    });

    it('navega al listado de turnos desde Ver todos', () => {
      createComponent();

      expect(findLink('.vet-section-header', 'Ver todos')?.getAttribute('href')).toBe(
        '/appointments',
      );
    });
  });

  describe('como propietario', () => {
    beforeEach(() => {
      authService.isAuthenticated.set(true);
      authService.hasAnyRole.mockImplementation((roles: readonly string[]) =>
        roles.includes('ROLE_CLIENT'),
      );
      authService.hasAnyPermission.mockImplementation((permissions: readonly string[]) =>
        permissions.includes('VIEW_CLINICAL_RECORDS') || permissions.includes('VIEW_BRANCHES'),
      );

      petService.getMyPets.mockReturnValue(
        of([
          {
            externalId: 'pet-1',
            name: 'Michi',
            birthDate: '2022-01-15',
            active: true,
            color: 'Gris',
            animalType: { externalId: 'type-1', name: 'Gato' },
            breed: {
              externalId: 'breed-1',
              name: 'Común',
              animalType: { externalId: 'type-1', name: 'Gato' },
            },
          },
          {
            externalId: 'pet-2',
            name: 'Rocco',
            birthDate: '2020-06-10',
            active: true,
            color: 'Marrón',
            animalType: { externalId: 'type-2', name: 'Perro' },
            breed: {
              externalId: 'breed-2',
              name: 'Mestizo',
              animalType: { externalId: 'type-2', name: 'Perro' },
            },
          },
        ]),
      );
    });

    it('muestra el título, el subtítulo y las mascotas del propietario', () => {
      createComponent();

      const element = fixture.nativeElement as HTMLElement;
      const cards = Array.from(
        element.querySelectorAll<HTMLElement>('.owner-pet-card'),
      );

      expect(element.querySelector('.owner-home-header h2')?.textContent?.trim()).toBe(
        '¡Bienvenido!',
      );
      expect(element.querySelector('.owner-home-header p')?.textContent?.trim()).toBe(
        'Este es tu espacio para gestionar y consultar tus mascotas',
      );
      expect(petService.getMyPets).toHaveBeenCalled();
      expect(cards).toHaveLength(2);
      expect(cards[0]?.textContent).toContain('Michi');
      expect(cards[0]?.textContent).toContain('Gato');
      expect(cards[1]?.textContent).toContain('Rocco');
      expect(cards[1]?.textContent).toContain('Perro');
      expect(
        cards[0]?.querySelector<HTMLAnchorElement>('a')?.getAttribute('href'),
      ).toBe('/pets/pet-1');
      expect(
        cards[1]?.querySelector<HTMLAnchorElement>('a')?.getAttribute('href'),
      ).toBe('/pets/pet-2');
      expect(
        cards[0]?.querySelector('.owner-pet-photo.is-placeholder'),
      ).not.toBeNull();
    });

    it('navega al listado de mascotas y a los accesos rápidos', () => {
      createComponent();

      expect(
        findLink('.owner-section-header', 'Ver todas')?.getAttribute('href'),
      ).toBe('/pets');
      expect(
        findLink('.quick-access-grid', 'SOLICITAR TURNO')?.getAttribute('href'),
      ).toBe('/appointments/new');
      expect(
        findLink('.quick-access-grid', 'MIS TURNOS')?.getAttribute('href'),
      ).toBe('/appointments');
      expect(
        findLink('.quick-access-grid', 'HISTORIAL CLÍNICO')?.getAttribute('href'),
      ).toBe('/visits');
      expect(
        findLink('.quick-access-grid', 'SUCURSALES')?.getAttribute('href'),
      ).toBe('/branches');
    });
  });
});
