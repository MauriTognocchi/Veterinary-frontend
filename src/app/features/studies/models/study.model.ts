import { VisitResponse } from "../../visits/models/visit.model";

export interface StudyRequest {
  name: string;
  description?: string | null;
}

export interface StudyResponse {
  externalId: string;
  name: string;
  description: string | null;
}

export interface StudyByVisitRequest {
  studyExternalId: string;
  visitExternalId: string;
  description: string;
}

export interface StudyByVisitResponse {
  externalId: string;
  description: string | null;
  study: StudyResponse;
  visit: VisitResponse;
  active: boolean;
}