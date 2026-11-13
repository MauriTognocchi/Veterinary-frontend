 import { BranchResponse } from '../../branches/models/branch.model';

    export interface ReceptionistResponse {
      externalId: string;
      firstName: string;
      lastName: string;
      phone?: string;
      email?: string;
      active?: boolean;
      branch?: BranchResponse | null;
    }

    export interface ReceptionistUpdateRequest {
      firstName: string;
      lastName: string;
      phone: string;
      email: string;
      branchExternalId?: string;
    }

    export interface ReceptionistFilters {
      firstName?: string;
      lastName?: string;
      branchExternalId?: string;
    }
