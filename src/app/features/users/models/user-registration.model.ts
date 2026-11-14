export const WEEK_DAYS = [
  { value: 'MONDAY', label: 'Lunes' },
  { value: 'TUESDAY', label: 'Martes' },
  { value: 'WEDNESDAY', label: 'Miércoles' },
  { value: 'THURSDAY', label: 'Jueves' },
  { value: 'FRIDAY', label: 'Viernes' },
  { value: 'SATURDAY', label: 'Sábado' },
  { value: 'SUNDAY', label: 'Domingo' },
] as const;

export type WorkDay = (typeof WEEK_DAYS)[number]['value'];

export type AdminUserRole = 'VETERINARIAN' | 'RECEPTIONIST';

export interface VeterinarianCreateRequest {
  firstName: string;
  lastName: string;
  licenseNumber: string;
  phone: string;
  email: string;
  password: string;
  workStartTime: string;
  workEndTime: string;
  workDays: WorkDay[];
  branchExternalId: string;
}

export interface ReceptionistCreateRequest {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  branchExternalId: string;
}

export interface CreatedUserResponse {
  externalId: string;
  firstName: string;
  lastName: string;
  email: string;
}
