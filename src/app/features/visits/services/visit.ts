 import { Injectable, inject } from '@angular/core';
    import { HttpClient, HttpParams } from '@angular/common/http';
    import { Observable } from 'rxjs';
    import {
      VisitResponse,
      VisitRequest,
      WalkInVisitRequest,
      VisitUpdateRequest,
      VisitFilters,
    } from '../models/visit.model';

    @Injectable({ providedIn: 'root' })
    export class VisitService {
      private readonly http = inject(HttpClient);
      private readonly baseUrl = 'http://localhost:8080/api/visits';
    
      getAll(filters?: VisitFilters): Observable<VisitResponse[]> {
        let params = new HttpParams();
        if (filters?.veterinarianName) params = params.set('veterinarianName', filters.veterinarianName);
        if (filters?.petName) params = params.set('petName', filters.petName);
        if (filters?.walkIn !== undefined) params = params.set('walkIn', String(filters.walkIn));
        return this.http.get<VisitResponse[]>(this.baseUrl, { params });
      }

      getById(externalId: string): Observable<VisitResponse> {
        return this.http.get<VisitResponse>(`${this.baseUrl}/${externalId}`);
      }

      getMedicalHistory(petExternalId: string): Observable<VisitResponse[]> {
        return this.http.get<VisitResponse[]>(`${this.baseUrl}/medical-history/${petExternalId}`);
      }

      create(request: VisitRequest): Observable<VisitResponse> {
        return this.http.post<VisitResponse>(this.baseUrl, request);
      }

      createWalkIn(request: WalkInVisitRequest): Observable<VisitResponse> {
        return this.http.post<VisitResponse>(`${this.baseUrl}/walk-in`, request);
      }

      update(externalId: string, request: VisitUpdateRequest): Observable<VisitResponse> {
        return this.http.put<VisitResponse>(`${this.baseUrl}/${externalId}`, request);
      }
    }