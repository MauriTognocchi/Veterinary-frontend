import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PrescriptionRequest, PrescriptionResponse } from '../models/prescription.model';

@Injectable({ providedIn: 'root' })
export class PrescriptionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api';

  getByVisit(visitExternalId: string): Observable<PrescriptionResponse[]> {
    return this.http.get<PrescriptionResponse[]>(
      `${this.baseUrl}/visits/${encodeURIComponent(visitExternalId)}/prescriptions`,
    );
  }

  create(request: PrescriptionRequest): Observable<PrescriptionResponse> {
    return this.http.post<PrescriptionResponse>(
      `${this.baseUrl}/prescriptions`,
      request,
    );
  }

  delete(externalId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/prescriptions/${encodeURIComponent(externalId)}`,
    );
  }
}
