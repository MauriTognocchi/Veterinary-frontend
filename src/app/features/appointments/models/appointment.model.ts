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
  appointmentDate: string; // ISO LocalDateTime yyyy-MM-dd'T'HH:mm:ss, sin zona horaria
  durationMinutes: number;
  reason: string;
  status: AppointmentStatus;
  pet: PetResponse | null;
  veterinarian: VeterinarianResponse | null;
  branch: BranchResponse | null;
}

export interface AppointmentFilters {
  dateFrom?: string; // yyyy-MM-dd
  dateTo?: string; // yyyy-MM-dd
  date?: string; // Coincidencia exacta de fecha y hora; no se combina con dateFrom/dateTo
  reason?: string;
  status?: AppointmentStatus | '';
  petExternalId?: string;
  veterinarianExternalId?: string;
}
