import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  VeterinarianFilters,
  VeterinarianResponse,
  VeterinarianUpdateRequest,
} from '../models/veterinarian.model';

@Injectable({ providedIn: 'root' })
export class VeterinarianService {
  private readonly baseUrl = 'http://localhost:8080';
  private http = inject(HttpClient);

  getAll(filters?: VeterinarianFilters): Observable<VeterinarianResponse[]> {
    let params = new HttpParams();

    if (filters) {
      const firstName = filters.firstName?.trim();
      const lastName = filters.lastName?.trim();
      const licenseNumber = filters.licenseNumber?.trim();
      const branchExternalId = filters.branchExternalId?.trim();

      if (firstName) {
        params = params.set('firstName', firstName);
      }
      if (lastName) {
        params = params.set('lastName', lastName);
      }
      if (licenseNumber) {
        params = params.set('licenseNumber', licenseNumber);
      }
      if (branchExternalId) {
        params = params.set('branchExternalId', branchExternalId);
      }
    }

    return this.http.get<VeterinarianResponse[]>(
      `${this.baseUrl}/api/veterinarians`,
      { params },
    );
  }

  getById(externalId: string): Observable<VeterinarianResponse> {
    return this.http.get<VeterinarianResponse>(
      `${this.baseUrl}/api/veterinarians/${encodeURIComponent(externalId)}`,
    );
  }

  update(
    externalId: string,
    veterinarian: VeterinarianUpdateRequest,
  ): Observable<VeterinarianResponse> {
    return this.http.put<VeterinarianResponse>(
      `${this.baseUrl}/api/veterinarians/${encodeURIComponent(externalId)}`,
      veterinarian,
    );
  }

  delete(externalId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/api/veterinarians/${encodeURIComponent(externalId)}`,
    );
  }
}
