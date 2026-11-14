 import { Injectable, inject } from '@angular/core';
    import { HttpClient } from '@angular/common/http';
    import { Observable } from 'rxjs';
    import { OwnerByPetDTO, OwnerByPetResponse } from '../models/owner-by-pet.model';
    
    @Injectable({ providedIn: 'root' })
    export class OwnerByPetService {
      private readonly baseUrl = 'http://localhost:8080';
      private http = inject(HttpClient);
    
      getAll(): Observable<OwnerByPetResponse[]> {
        return this.http.get<OwnerByPetResponse[]>(`${this.baseUrl}/api/owner-by-pet`);
      }
    
      getById(externalId: string): Observable<OwnerByPetResponse> {
        return this.http.get<OwnerByPetResponse>(
          `${this.baseUrl}/api/owner-by-pet/${encodeURIComponent(externalId)}`,
        );
      }
    
      create(dto: OwnerByPetDTO): Observable<OwnerByPetResponse> {
        return this.http.post<OwnerByPetResponse>(`${this.baseUrl}/api/owner-by-pet`, dto);
      }
    
      update(externalId: string, dto: OwnerByPetDTO): Observable<OwnerByPetResponse> {
        return this.http.put<OwnerByPetResponse>(
          `${this.baseUrl}/api/owner-by-pet/${encodeURIComponent(externalId)}`,
          dto,
        );
      }
    
      delete(externalId: string): Observable<void> {
        return this.http.delete<void>(
          `${this.baseUrl}/api/owner-by-pet/${encodeURIComponent(externalId)}`,
        );
      }
    }