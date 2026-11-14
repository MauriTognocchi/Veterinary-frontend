import { BranchResponse } from '../../branches/models/branch.model';
import { PetResponse } from '../../pets/models/pet.model';
import { VeterinarianResponse } from '../../veterinarians/models/veterinarian.model';

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface AppointmentResponse {
  externalId: string;
  appointmentDate: string; 
  durationMinutes: number;
  reason: string;
  status: AppointmentStatus;
  pet: PetResponse | null;
  veterinarian: VeterinarianResponse | null;
  branch: BranchResponse | null;
}

export interface AppointmentFilters {
  dateFrom?: string; 
  dateTo?: string; 
  date?: string; 
  reason?: string;
  status?: AppointmentStatus | '';
  petExternalId?: string;
  veterinarianExternalId?: string;
}

 export interface AppointmentCreateRequest {
      appointmentDate: string; 
      durationMinutes: number;
      reason: string;
      petExternalId: string;
      veterinarianExternalId: string;
      branchExternalId: string;
    }

    export interface AppointmentUpdateRequest {
      appointmentDate: string; 
      durationMinutes: number;
      reason: string;
      status: AppointmentStatus;
      petExternalId: string;
      veterinarianExternalId: string;
      branchExternalId: string;
    }
