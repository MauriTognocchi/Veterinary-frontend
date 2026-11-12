import { VisitResponse } from '../../visits/models/visit.model';

export interface StudyRequest {
  name: string;
  description: string;
}

export interface StudyResponse {
  externalId: string;
  name: string;
  description: string;
}

export interface StudyByVisitRequest {
  studyExternalId: string;
  visitExternalId: string;
}

export interface StudyByVisitResponse {
  externalId: string;
  study: StudyResponse;
  visit: VisitResponse;
  active: boolean;
}
