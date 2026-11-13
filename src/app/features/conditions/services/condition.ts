import { Injectable, inject } from '@angular/core';
    import { HttpClient } from '@angular/common/http';
    import { Observable } from 'rxjs';
    export type { ConditionRequest, ConditionResponse } from '../models/condition.model';
    import { ConditionRequest, ConditionResponse } from '../models/condition.model';

    @Injectable({ providedIn: 'root' })
    export class ConditionService {
      private readonly baseUrl = 'http://localhost:8080';
      private http = inject(HttpClient);

      getAll(): Observable<ConditionResponse[]> {
        return this.http.get<ConditionResponse[]>(`${this.baseUrl}/api/conditions`);
      }

      getById(externalId: string): Observable<ConditionResponse> {
        return this.http.get<ConditionResponse>(
          `${this.baseUrl}/api/conditions/${encodeURIComponent(externalId)}`,
        );
      }

      create(condition: ConditionRequest): Observable<ConditionResponse> {
        return this.http.post<ConditionResponse>(
          `${this.baseUrl}/api/conditions`,
          condition,
        );
      }

      update(
        externalId: string,
        condition: ConditionRequest,
      ): Observable<ConditionResponse> {
        return this.http.put<ConditionResponse>(
          `${this.baseUrl}/api/conditions/${encodeURIComponent(externalId)}`,
          condition,
        );
      }

      delete(externalId: string): Observable<void> {
        return this.http.delete<void>(
          `${this.baseUrl}/api/conditions/${encodeURIComponent(externalId)}`,
        );
      }
    }