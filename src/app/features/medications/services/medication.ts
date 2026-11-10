import { Injectable, inject } from '@angular/core';
    import { HttpClient } from '@angular/common/http';
    import { Observable } from 'rxjs';
    import {
      MedicationRequest,
      MedicationResponse,
    } from '../models/medication.model';
    
    @Injectable({ providedIn: 'root' })
    export class MedicationService {
      private readonly baseUrl = 'http://localhost:8080';
      private http = inject(HttpClient);
    
      getAll(): Observable<MedicationResponse[]> {
        return this.http.get<MedicationResponse[]>(
          `${this.baseUrl}/api/medications`,
        );
      }
    
      getById(externalId: string): Observable<MedicationResponse> {
        return this.http.get<MedicationResponse>(
          `${this.baseUrl}/api/medications/${encodeURIComponent(externalId)}`,
        );
      }
    
      getByName(name: string): Observable<MedicationResponse> {
        return this.http.get<MedicationResponse>(
          `${this.baseUrl}/api/medications/name/${encodeURIComponent(name)}`,
        );
      }
    
      create(medication: MedicationRequest): Observable<MedicationResponse> {
        return this.http.post<MedicationResponse>(
          `${this.baseUrl}/api/medications`,
          medication,
        );
      }
    
      update(
        externalId: string,
        medication: MedicationRequest,
      ): Observable<MedicationResponse> {
        return this.http.put<MedicationResponse>(
          `${this.baseUrl}/api/medications/${encodeURIComponent(externalId)}`,
          medication,
        );
      }
    
      delete(externalId: string): Observable<void> {
        return this.http.delete<void>(
          `${this.baseUrl}/api/medications/${encodeURIComponent(externalId)}`,
        );
      }
    }