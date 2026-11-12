import { VisitResponse } from '../../visits/models/visit.model';

export interface DiagnosisRequest {
  description: string;
  dateDiagnosis: string;
  observations: string;
  visitExternalId: string;
}

export interface DiagnosisResponse {
  externalId: string;
  description: string;
  dateDiagnosis: string;
  observations: string;
  visit: VisitResponse;
}
