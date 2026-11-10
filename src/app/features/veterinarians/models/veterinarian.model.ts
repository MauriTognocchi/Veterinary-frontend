import { BranchResponse } from '../../branches/models/branch.model';

export type VeterinarianWorkDay =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface VeterinarianResponse {
  externalId: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  phone: string;
  email: string;
  workStartTime: string;
  workEndTime: string;
  workDays: VeterinarianWorkDay[] | null;
  active: boolean;
  branch: BranchResponse | null;
}

export interface VeterinarianFilters {
  firstName?: string;
  lastName?: string;
  licenseNumber?: string;
  branchExternalId?: string;
}
