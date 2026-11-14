import { OwnerResponse } from '../../owners/models/owner.model';
    import { PetResponse } from '../../pets/models/pet.model';
    
    export interface OwnerByPetDTO {
      ownerExternalId: string;
      petExternalId: string;
    }
    
    export interface OwnerByPetResponse {
      externalId: string;
      owner: OwnerResponse;
      pet: PetResponse;
    }