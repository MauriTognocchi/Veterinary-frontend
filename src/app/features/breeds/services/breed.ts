 import { Injectable, inject } from '@angular/core';
    import { HttpClient } from '@angular/common/http';
    import { Observable } from 'rxjs';
    import { BreedRequest, BreedResponse } from '../models/breed.model';
    
    @Injectable({ providedIn: 'root' })
    export class BreedService {
      private readonly baseUrl = 'http://localhost:8080';
      private http = inject(HttpClient);
    
      getAll(): Observable<BreedResponse[]> {
        return this.http.get<BreedResponse[]>(`${this.baseUrl}/api/breeds`);
      }

      getByAnimalTypeId(animalTypeId: string): Observable<BreedResponse[]> {
        return this.http.get<BreedResponse[]>(
          `${this.baseUrl}/api/breeds/animal-type/${encodeURIComponent(animalTypeId)}`,
        );
      }

      getById(externalId: string): Observable<BreedResponse> {
        return this.http.get<BreedResponse>(
          `${this.baseUrl}/api/breeds/${encodeURIComponent(externalId)}`,
        );
      }
    
      create(breed: BreedRequest): Observable<BreedResponse> {
        return this.http.post<BreedResponse>(`${this.baseUrl}/api/breeds`, breed);
      }
    
      update(externalId: string, breed: BreedRequest): Observable<BreedResponse> {
        return this.http.put<BreedResponse>(
          `${this.baseUrl}/api/breeds/${encodeURIComponent(externalId)}`,
          breed,
        );
      }
    
      delete(externalId: string): Observable<void> {
        return this.http.delete<void>(
          `${this.baseUrl}/api/breeds/${encodeURIComponent(externalId)}`,
        );
      }
    }