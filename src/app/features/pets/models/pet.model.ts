import { AnimalTypeResponse } from '../../animal-types/models/animal-type.model';
import { BreedResponse } from '../../breeds/models/breed.model';

export interface PetRequest {
  name: string;
  birthDate: string; // Formato YYYY-MM-DD
  color: string;
  animalTypeId: string;
  breedId: string;
}

export interface PetResponse {
  externalId: string;
  name: string;
  birthDate: string;
  active: boolean;
  color: string;
  description: string | null;
  animalType: AnimalTypeResponse;
  breed: BreedResponse;
  visitsCount?: number;
  lastVisitDate?: string;
  activeAppointments?: number;
}

export interface DescriptionUpdateRequest {
  description: string | null;
}

export type SeverityLevel = 'MILD' | 'MODERATE' | 'SEVERE';

export interface ConditionByPetResponse {
  conditionExternalId: string;
  petExternalId: string;
  conditionName: string;
  diagnosisDate: string;
  severity: SeverityLevel;
  observations: string | null;
}

export interface ConditionByPetRequest {
  conditionExternalId: string;
  petExternalId: string;
  diagnosisDate: string;
  severity: SeverityLevel;
  observations: string | null;
}