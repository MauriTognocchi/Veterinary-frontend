import { Injectable, inject } from '@angular/core';
    import { HttpClient } from '@angular/common/http';
    import { Observable } from 'rxjs';
    import {
      ConditionByPetRequest,
      ConditionByPetResponse,
      DescriptionUpdateRequest,
      PetRequest,
      PetResponse,
    } from '../models/pet.model';

    @Injectable({ providedIn: 'root' })
    export class PetService {
      private readonly baseUrl = 'http://localhost:8080';
      private http = inject(HttpClient);
    
      getAll(): Observable<PetResponse[]> {
        return this.http.get<PetResponse[]>(`${this.baseUrl}/api/pets`);
      }

      getById(externalId: string): Observable<PetResponse> {
        return this.http.get<PetResponse>(
          `${this.baseUrl}/api/pets/${encodeURIComponent(externalId)}`,
        );
      }

      getMyPets(): Observable<PetResponse[]> {
        return this.http.get<PetResponse[]>(`${this.baseUrl}/api/pets/my`);
      }

      create(pet: PetRequest): Observable<PetResponse> {
        return this.http.post<PetResponse>(`${this.baseUrl}/api/pets`, pet);
      }

      update(externalId: string, pet: PetRequest): Observable<PetResponse> {
        return this.http.put<PetResponse>(
          `${this.baseUrl}/api/pets/${encodeURIComponent(externalId)}`,
          pet,
        );
      }

      delete(externalId: string): Observable<void> {
        return this.http.delete<void>(
          `${this.baseUrl}/api/pets/${encodeURIComponent(externalId)}`,
        );
      }

      updateDescription(
        externalId: string,
        payload: DescriptionUpdateRequest,
      ): Observable<PetResponse> {
        return this.http.put<PetResponse>(
          `${this.baseUrl}/api/pets/${encodeURIComponent(externalId)}/description`,
          payload,
        );
      }

      getConditionsByPet(externalId: string): Observable<ConditionByPetResponse[]> {
        return this.http.get<ConditionByPetResponse[]>(
          `${this.baseUrl}/api/pets/${encodeURIComponent(externalId)}/conditions`,
        );
      }

      createConditionByPet(
        petExternalId: string,
        payload: ConditionByPetRequest,
      ): Observable<ConditionByPetResponse> {
        return this.http.post<ConditionByPetResponse>(
          `${this.baseUrl}/api/conditions-by-pets`,
          payload,
        );
      }
    }