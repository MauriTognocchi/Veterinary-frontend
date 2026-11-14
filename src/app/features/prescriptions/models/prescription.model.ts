import { DiagnosisResponse } from '../../diagnoses/models/diagnosis.model';
import { MedicationResponse } from '../../medications/models/medication.model';

export interface PrescriptionRequest {
  quantity: number;
  indication: string;
  expirationDate: string;
  medicationExternalId: string;
  diagnosisExternalId: string;
}

export interface PrescriptionResponse {
  externalId: string;
  quantity: number;
  indication: string;
  expirationDate: string;
  active: boolean;
  medication: MedicationResponse;
  diagnosis: DiagnosisResponse;
}
