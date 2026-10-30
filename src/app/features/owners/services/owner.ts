import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OwnerRequest, OwnerResponse } from '../models/owner.model';

@Injectable({ providedIn: 'root' })
export class OwnerService {
  // URL base temporal - debe confirmarse con la configuración real del backend
  private readonly baseUrl = 'http://localhost:8080';
  private http = inject(HttpClient);

  getAll(): Observable<OwnerResponse[]> {
    return this.http.get<OwnerResponse[]>(`${this.baseUrl}/api/owners`);
  }

  getById(externalId: string): Observable<OwnerResponse> {
    return this.http.get<OwnerResponse>(`${this.baseUrl}/api/owners/${encodeURIComponent(externalId)}`); // Codifica el parámetro para que los caracteres especiales no alteren la URL.
  }

  getByDni(dni: string): Observable<OwnerResponse> {
    return this.http.get<OwnerResponse>(`${this.baseUrl}/api/owners/dni/${encodeURIComponent(dni)}`);
  }

  create(owner: OwnerRequest): Observable<OwnerResponse> {
    return this.http.post<OwnerResponse>(`${this.baseUrl}/api/owners`, owner);
  }

  update(externalId: string, owner: OwnerRequest): Observable<OwnerResponse> {
    return this.http.put<OwnerResponse>(`${this.baseUrl}/api/owners/${encodeURIComponent(externalId)}`, owner);
  }

  delete(externalId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/owners/${encodeURIComponent(externalId)}`);
  }
}
