import { HttpClient, HttpParams } from '@angular/common/http';
    import { Injectable, inject } from '@angular/core';
    import { Observable } from 'rxjs';
    import {
      ReceptionistFilters,
      ReceptionistResponse,
      ReceptionistUpdateRequest,
    } from '../models/receptionist.model';

    @Injectable({ providedIn: 'root' })
    export class ReceptionistService {
      private readonly baseUrl = 'http://localhost:8080';
      private http = inject(HttpClient);

      getAll(filters?: ReceptionistFilters): Observable<ReceptionistResponse[]> {
        let params = new HttpParams();

        if (filters) {
          const firstName = filters.firstName?.trim();
          const lastName = filters.lastName?.trim();
          const branchExternalId = filters.branchExternalId?.trim();

          if (firstName) {
            params = params.set('firstName', firstName);
          }
          if (lastName) {
            params = params.set('lastName', lastName);
          }
          if (branchExternalId) {
            params = params.set('branchExternalId', branchExternalId);
          }
        }

        return this.http.get<ReceptionistResponse[]>(
          `${this.baseUrl}/api/receptionists`,
          { params },
        );
      }

      getById(externalId: string): Observable<ReceptionistResponse> {
        return this.http.get<ReceptionistResponse>(
          `${this.baseUrl}/api/receptionists/${encodeURIComponent(externalId)}`,
        );
      }

      update(
        externalId: string,
        receptionist: ReceptionistUpdateRequest,
      ): Observable<ReceptionistResponse> {
        return this.http.put<ReceptionistResponse>(
          `${this.baseUrl}/api/receptionists/${encodeURIComponent(externalId)}`,
          receptionist,
        );
      }

      delete(externalId: string): Observable<void> {
        return this.http.delete<void>(
          `${this.baseUrl}/api/receptionists/${encodeURIComponent(externalId)}`,
        );
      }
 
      reactivate(externalId: string): Observable<ReceptionistResponse> {
        return this.http.patch<ReceptionistResponse>(
          `${this.baseUrl}/api/receptionists/${encodeURIComponent(externalId)}/reactivate`,
          null,
        );
      }
    }
