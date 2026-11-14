 import { AppointmentResponse } from '../../appointments/models/appointment.model';
    import { VeterinarianResponse } from '../../veterinarians/models/veterinarian.model';
    import { PetResponse } from '../../pets/models/pet.model';

    export interface VisitResponse {
      externalId: string;
      observations: string;
      appointment: AppointmentResponse | null;
      veterinarian: VeterinarianResponse;
      pet: PetResponse;
      visitDate: string;
    }

    export interface VisitRequest {
      observations: string;
      appointmentExternalId: string;
      veterinarianExternalId: string;
    }

    export interface WalkInVisitRequest {
      observations: string;
      petExternalId: string;
      veterinarianExternalId: string;
    }

    export interface VisitUpdateRequest {
      observations: string;
      veterinarianExternalId: string;
    }

    export interface VisitFilters {
      veterinarianName?: string;
      petName?: string;
      walkIn?: boolean;
    }