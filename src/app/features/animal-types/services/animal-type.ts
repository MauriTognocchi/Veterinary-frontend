import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AnimalTypeRequest,
  AnimalTypeResponse,
} from '../models/animal-type.model';

@Injectable({ providedIn: 'root' })
export class AnimalTypeService {
  private readonly baseUrl = 'http://localhost:8080';
  private http = inject(HttpClient);

  getAll(): Observable<AnimalTypeResponse[]> {
    return this.http.get<AnimalTypeResponse[]>(
      `${this.baseUrl}/api/animal-types`,
    );
  }

  getById(externalId: string): Observable<AnimalTypeResponse> {
    return this.http.get<AnimalTypeResponse>(
      `${this.baseUrl}/api/animal-types/${encodeURIComponent(externalId)}`,
    );
  }

  create(animalType: AnimalTypeRequest): Observable<AnimalTypeResponse> {
    return this.http.post<AnimalTypeResponse>(
      `${this.baseUrl}/api/animal-types`,
      animalType,
    );
  }

  update(
    externalId: string,
    animalType: AnimalTypeRequest,
  ): Observable<AnimalTypeResponse> {
    return this.http.put<AnimalTypeResponse>(
      `${this.baseUrl}/api/animal-types/${encodeURIComponent(externalId)}`,
      animalType,
    );
  }

  delete(externalId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/api/animal-types/${encodeURIComponent(externalId)}`,
    );
  }
}
