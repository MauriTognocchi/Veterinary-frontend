export interface MedicationRequest {
      name: string;
      dosage: number;
      dosageUnit: string;
    }
    
    export interface MedicationResponse {
      externalId: string;
      name: string;
      dosage: number;
      dosageUnit: string;
    }