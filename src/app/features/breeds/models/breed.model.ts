import { AnimalTypeResponse } from '../../animal-types/models/animal-type.model';

export interface BreedRequest {
  name: string;
  animalTypeId: string;
}

export interface BreedResponse {
  externalId: string;
  name: string;
  animalType: AnimalTypeResponse;
}