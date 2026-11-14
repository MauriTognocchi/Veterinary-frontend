import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  StudyByVisitRequest,
  StudyByVisitResponse,
  StudyRequest,
  StudyResponse,
} from '../models/study.model';

@Injectable({ providedIn: 'root' })
export class StudyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api';

  getAll(): Observable<StudyResponse[]> {
    return this.http.get<StudyResponse[]>(`${this.baseUrl}/studies`);
  }

  getById(externalId: string): Observable<StudyResponse> {
    return this.http.get<StudyResponse>(
      `${this.baseUrl}/studies/${encodeURIComponent(externalId)}`,
    );
  }

  create(study: StudyRequest): Observable<StudyResponse> {
    return this.http.post<StudyResponse>(`${this.baseUrl}/studies`, study);
  }

  update(
    externalId: string,
    study: StudyRequest,
  ): Observable<StudyResponse> {
    return this.http.put<StudyResponse>(
      `${this.baseUrl}/studies/${encodeURIComponent(externalId)}`,
      study,
    );
  }

  delete(externalId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/studies/${encodeURIComponent(externalId)}`,
    );
  }

  getAssociations(): Observable<StudyByVisitResponse[]> {
    return this.http.get<StudyByVisitResponse[]>(
      `${this.baseUrl}/studies-by-visits`,
    );
  }

  associate(request: StudyByVisitRequest): Observable<StudyByVisitResponse> {
    return this.http.post<StudyByVisitResponse>(
      `${this.baseUrl}/studies-by-visits`,
      request,
    );
  }

  deactivateAssociation(externalId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/studies-by-visits/${encodeURIComponent(externalId)}`,
    );
  }
}