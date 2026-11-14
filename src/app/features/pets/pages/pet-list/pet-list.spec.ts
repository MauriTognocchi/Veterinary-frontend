import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { PetResponse } from '../../models/pet.model';
import { PetService } from '../../services/pet';
import { PetList } from './pet-list';

describe('PetList', () => {
  let component: PetList;
  let fixture: ComponentFixture<PetList>;
  let petService: { getAll: ReturnType<typeof vi.fn>; getMyPets: ReturnType<typeof vi.fn> };
  let authService: {
    hasRole: ReturnType<typeof vi.fn>;
    hasAnyRole: ReturnType<typeof vi.fn>;
    hasAnyPermission: ReturnType<typeof vi.fn>;
  };

  const pet: PetResponse = {
    externalId: 'pet-1',
    name: 'Firulais',
    birthDate: '2020-05-05',
    active: true,
    color: 'Marrón',
    description: null,
    animalType: { externalId: 'animal-type-1', name: 'Perro' },
    breed: {
      externalId: 'breed-1',
      name: 'Labrador',
      animalType: { externalId: 'animal-type-1', name: 'Perro' },
    },
  };

  function createComponent(): void {
    fixture = TestBed.createComponent(PetList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function findCreateLink(): HTMLAnchorElement | undefined {
    const element = fixture.nativeElement as HTMLElement;
    return Array.from(
      element.querySelectorAll<HTMLAnchorElement>('.pet-list-header a'),
    ).find((link) => link.getAttribute('href') === '/pets/new');
  }

  function findEditLink(): HTMLAnchorElement | undefined {
    const element = fixture.nativeElement as HTMLElement;
    return Array.from(
      element.querySelectorAll<HTMLAnchorElement>('.actions-cell a'),
    ).find((link) => link.textContent?.trim() === 'Editar');
  }

  function findDeleteButton(): HTMLButtonElement | undefined {
    const element = fixture.nativeElement as HTMLElement;
    return Array.from(
      element.querySelectorAll<HTMLButtonElement>('.actions-cell button'),
    ).find((button) => button.textContent?.trim() === 'Eliminar');
  }

  beforeEach(async () => {
    petService = {
      getAll: vi.fn().mockReturnValue(of([pet])),
      getMyPets: vi.fn().mockReturnValue(of([pet])),
    };
    authService = {
      hasRole: vi.fn().mockReturnValue(false),
      hasAnyRole: vi.fn().mockReturnValue(false),
      hasAnyPermission: vi.fn().mockReturnValue(false),
    };

    await TestBed.configureTestingModule({
      imports: [PetList],
      providers: [
        provideRouter([]),
        { provide: PetService, useValue: petService },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();
  });

  it('se crea correctamente', () => {
    createComponent();

    expect(component).toBeTruthy();
  });

  it('muestra Editar con permiso de escritura de mascotas', () => {
    authService.hasAnyRole.mockReturnValue(true);

    createComponent();

    expect(findEditLink()?.getAttribute('href')).toBe('/pets/pet-1/edit');
    expect(findDeleteButton()).toBeUndefined();
  });

  it('permite al propietario registrar una mascota desde Mis mascotas', () => {
    authService.hasRole.mockImplementation(
      (role: string) => role === 'ROLE_CLIENT',
    );
    authService.hasAnyRole.mockImplementation((roles: string[]) =>
      roles.includes('ROLE_CLIENT'),
    );

    createComponent();

    expect(findCreateLink()?.textContent?.trim()).toBe('Registrar mascota');
    expect(findDeleteButton()).toBeUndefined();
    expect(findEditLink()).toBeUndefined();
    expect(petService.getMyPets).toHaveBeenCalled();
    expect(petService.getAll).not.toHaveBeenCalled();
  });

  it('mantiene el alta de mascotas para ADMIN y RECEPTIONIST', () => {
    authService.hasAnyRole.mockReturnValue(true);

    createComponent();

    expect(findCreateLink()?.textContent?.trim()).toBe('Nueva mascota');
    expect(findEditLink()?.getAttribute('href')).toBe('/pets/pet-1/edit');
  });

  it('oculta Editar sin permiso de escritura de mascotas', () => {
    createComponent();

    expect(findEditLink()).toBeUndefined();
  });

  it('muestra Eliminar con DELETE_PETS', () => {
    authService.hasAnyPermission.mockImplementation((permissions: string[]) =>
      permissions.includes('DELETE_PETS'),
    );

    createComponent();

    expect(findDeleteButton()).toBeDefined();
    expect(findEditLink()).toBeUndefined();
  });

  it('oculta Eliminar sin DELETE_PETS', () => {
    createComponent();

    expect(findDeleteButton()).toBeUndefined();
  });
});
