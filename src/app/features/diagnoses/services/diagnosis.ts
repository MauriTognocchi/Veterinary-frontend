import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DiagnosisRequest, DiagnosisResponse } from '../models/diagnosis.model';

@Injectable({ providedIn: 'root' })
export class DiagnosisService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api';

  getByVisit(visitExternalId: string): Observable<DiagnosisResponse[]> {
    return this.http.get<DiagnosisResponse[]>(
      `${this.baseUrl}/visits/${encodeURIComponent(visitExternalId)}/diagnoses`,
    );
  }

  create(request: DiagnosisRequest): Observable<DiagnosisResponse> {
    return this.http.post<DiagnosisResponse>(
      `${this.baseUrl}/diagnoses`,
      request,
    );
  }

  update(
    externalId: string,
    request: DiagnosisRequest,
  ): Observable<DiagnosisResponse> {
    return this.http.put<DiagnosisResponse>(
      `${this.baseUrl}/diagnoses/${encodeURIComponent(externalId)}`,
      request,
    );
  }

  delete(externalId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/diagnoses/${encodeURIComponent(externalId)}`,
    );
  }
}
