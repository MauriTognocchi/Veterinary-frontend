import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { OwnerByPetService } from '../../../owners-by-pets/services/owner-by-pet';
import { PetResponse } from '../../models/pet.model';
import { PetService } from '../../services/pet';
import { PetDetail } from './pet-detail';

describe('PetDetail', () => {
  let component: PetDetail;
  let fixture: ComponentFixture<PetDetail>;
  let petService: { getById: ReturnType<typeof vi.fn> };
  let ownerByPetService: { getAll: ReturnType<typeof vi.fn> };
  let authService: {
    hasAnyRole: ReturnType<typeof vi.fn>;
    hasAnyPermission: ReturnType<typeof vi.fn>;
  };

  const pet: PetResponse = {
    externalId: 'pet-1',
    name: 'Firulais',
    birthDate: '2020-05-05',
    active: true,
    color: 'Marrón',
    animalType: { externalId: 'animal-type-1', name: 'Perro' },
    breed: { externalId: 'breed-1', name: 'Labrador' },
  };

  function createComponent(): void {
    fixture = TestBed.createComponent(PetDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function findDeleteButton(): HTMLButtonElement | undefined {
    const element = fixture.nativeElement as HTMLElement;
    return Array.from(
      element.querySelectorAll<HTMLButtonElement>('button'),
    ).find((button) => button.textContent?.trim() === 'Eliminar');
  }

  beforeEach(async () => {
    petService = { getById: vi.fn().mockReturnValue(of(pet)) };
    ownerByPetService = { getAll: vi.fn().mockReturnValue(of([])) };
    authService = {
      hasAnyRole: vi.fn().mockReturnValue(false),
      hasAnyPermission: vi.fn().mockReturnValue(false),
    };

    await TestBed.configureTestingModule({
      imports: [PetDetail],
      providers: [
        provideRouter([]),
        { provide: PetService, useValue: petService },
        { provide: OwnerByPetService, useValue: ownerByPetService },
        { provide: AuthService, useValue: authService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ externalId: 'pet-1' }),
            },
          },
        },
      ],
    }).compileComponents();
  });

  it('se crea correctamente', () => {
    createComponent();

    expect(component).toBeTruthy();
  });

  it('no consulta las relaciones con propietarios sin VIEW_OWNERS', () => {
    createComponent();

    expect(ownerByPetService.getAll).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.owner-box')).toBeNull();
  });

  it('consulta las relaciones y muestra el dueño con VIEW_OWNERS', () => {
    authService.hasAnyPermission.mockImplementation((permissions: string[]) =>
      permissions.includes('VIEW_OWNERS'),
    );

    createComponent();

    expect(ownerByPetService.getAll).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('.owner-box')).not.toBeNull();
  });

  it('muestra Eliminar con DELETE_PETS', () => {
    authService.hasAnyPermission.mockImplementation((permissions: string[]) =>
      permissions.includes('DELETE_PETS'),
    );

    createComponent();

    expect(findDeleteButton()).toBeDefined();
  });

  it('oculta Eliminar sin DELETE_PETS', () => {
    createComponent();

    expect(findDeleteButton()).toBeUndefined();
  });
});
