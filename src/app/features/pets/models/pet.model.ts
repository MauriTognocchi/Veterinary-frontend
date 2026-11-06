import { AnimalTypeResponse } from '../../animal-types/models/animal-type.model';
    import { BreedResponse } from '../../breeds/models/breed.model';

    export interface PetAnimalTypeRef {
      name: string;
    }

    export interface PetBreedRef {
      name: string;
    }

    export interface PetRequest {
      name: string;
      birthDate: string; // Formato YYYY-MM-DD
      color: string;
      animalType: PetAnimalTypeRef;
      breed: PetBreedRef;
    }

    export interface PetResponse {
      externalId: string;
      name: string;
      birthDate: string;
      active: boolean;
      color: string;
      animalType: AnimalTypeResponse;
      breed: BreedResponse;
      visitsCount?: number;
      lastVisitDate?: string;
      activeAppointments?: number;
    }