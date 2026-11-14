import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { AnimalTypeService } from '../../../animal-types/services/animal-type';
import { BreedService } from '../../../breeds/services/breed';
import { OwnerService } from '../../../owners/services/owner';
import { OwnerByPetService } from '../../../owners-by-pets/services/owner-by-pet';
import { PetResponse } from '../../models/pet.model';
import { PetService } from '../../services/pet';
import { PetForm } from './pet-form';

describe('PetForm', () => {
  let component: PetForm;
  let fixture: ComponentFixture<PetForm>;
  let router: Router;
  let petService: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
  };
  let animalTypeService: { getAll: ReturnType<typeof vi.fn> };
  let breedService: { getByAnimalTypeId: ReturnType<typeof vi.fn> };
  let ownerService: { getAll: ReturnType<typeof vi.fn> };
  let ownerByPetService: {
    getAll: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  let authService: { hasRole: ReturnType<typeof vi.fn> };

  const savedPet: PetResponse = {
    externalId: 'pet-1',
    name: 'Firulais',
    birthDate: '2020-01-01',
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

  const petRequest = {
    name: 'Firulais',
    birthDate: '2020-01-01',
    color: 'Marrón',
    animalTypeId: 'animal-type-1',
    breedId: 'breed-1',
  };

  function createComponent(): void {
    fixture = TestBed.createComponent(PetForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function fillValidForm(): void {
    component.petForm.patchValue({
      ...petRequest,
      ownerExternalId: '',
    });
  }

  beforeEach(async () => {
    petService = {
      create: vi.fn().mockReturnValue(of(savedPet)),
      update: vi.fn().mockReturnValue(of(savedPet)),
      getById: vi.fn().mockReturnValue(of(savedPet)),
    };
    animalTypeService = { getAll: vi.fn().mockReturnValue(of([])) };
    breedService = { getByAnimalTypeId: vi.fn().mockReturnValue(of([])) };
    ownerService = { getAll: vi.fn().mockReturnValue(of([])) };
    ownerByPetService = {
      getAll: vi.fn().mockReturnValue(of([])),
      create: vi.fn().mockReturnValue(of({})),
    };
    authService = { hasRole: vi.fn().mockReturnValue(false) };

    await TestBed.configureTestingModule({
      imports: [PetForm],
      providers: [
        provideRouter([]),
        { provide: PetService, useValue: petService },
        { provide: AnimalTypeService, useValue: animalTypeService },
        { provide: BreedService, useValue: breedService },
        { provide: OwnerService, useValue: ownerService },
        { provide: OwnerByPetService, useValue: ownerByPetService },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('should create', () => {
    createComponent();

    expect(component).toBeTruthy();
  });

  it('carga las razas del tipo de animal seleccionado', () => {
    const breed = savedPet.breed!;
    animalTypeService.getAll.mockReturnValue(
      of([{ externalId: 'animal-type-1', name: 'Perro' }]),
    );
    breedService.getByAnimalTypeId.mockReturnValue(of([breed]));

    createComponent();
    const select = fixture.nativeElement.querySelector(
      '#animalTypeId',
    ) as HTMLSelectElement;
    select.value = 'animal-type-1';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(breedService.getByAnimalTypeId).toHaveBeenCalledWith(
      'animal-type-1',
    );
    expect(component.filteredBreeds()).toEqual([breed]);
  });

  it('permite al propietario crear su mascota sin enviar ownerExternalId', () => {
    authService.hasRole.mockImplementation(
      (role: string) => role === 'ROLE_CLIENT',
    );

    createComponent();
    fillValidForm();
    component.onSubmit();

    expect(ownerService.getAll).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#ownerExternalId')).toBeNull();
    expect(petService.create).toHaveBeenCalledWith(petRequest);
    expect(ownerByPetService.create).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/pets']);
  });

  it('mantiene la asignación de propietario para ADMIN y RECEPTIONIST', () => {
    authService.hasRole.mockReturnValue(false);

    createComponent();
    fillValidForm();
    component.petForm.patchValue({ ownerExternalId: 'owner-1' });
    component.onSubmit();

    expect(ownerService.getAll).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#ownerExternalId')).not.toBeNull();
    expect(petService.create).toHaveBeenCalledWith(petRequest);
    expect(ownerByPetService.create).toHaveBeenCalledWith({
      ownerExternalId: 'owner-1',
      petExternalId: 'pet-1',
    });
    expect(router.navigate).toHaveBeenCalledWith(['/pets']);
  });
});
