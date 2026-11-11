import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AppointmentFilters, AppointmentResponse } from '../models/appointment.model';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private readonly baseUrl = 'http://localhost:8080';
  private http = inject(HttpClient);

  getAll(filters?: AppointmentFilters): Observable<AppointmentResponse[]> {
    let params = new HttpParams();

    if (filters) {
      const dateFrom = filters.dateFrom?.trim();
      const dateTo = filters.dateTo?.trim();
      const date = filters.date?.trim();
      const reason = filters.reason?.trim();
      const status = filters.status?.trim();
      const petExternalId = filters.petExternalId?.trim();
      const veterinarianExternalId = filters.veterinarianExternalId?.trim();

      if (dateFrom) {
        params = params.set('dateFrom', dateFrom);
      }
      if (dateTo) {
        params = params.set('dateTo', dateTo);
      }
      if (date && !dateFrom && !dateTo) {
        params = params.set('date', date);
      }
      if (reason) {
        params = params.set('reason', reason);
      }
      if (status) {
        params = params.set('status', status);
      }
      if (petExternalId) {
        params = params.set('petExternalId', petExternalId);
      }
      if (veterinarianExternalId) {
        params = params.set('veterinarianExternalId', veterinarianExternalId);
      }
    }

    return this.http.get<AppointmentResponse[]>(
      `${this.baseUrl}/api/appointments`,
      { params },
    );
  }
}
