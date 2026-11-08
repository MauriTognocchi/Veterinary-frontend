import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreatedUserResponse,
  ReceptionistCreateRequest,
  VeterinarianCreateRequest,
} from '../models/user-registration.model';

@Injectable({ providedIn: 'root' })
export class UserRegistrationService {
  private readonly baseUrl = 'http://localhost:8080';
  private http = inject(HttpClient);

  createVeterinarian(
    request: VeterinarianCreateRequest,
  ): Observable<CreatedUserResponse> {
    return this.http.post<CreatedUserResponse>(
      `${this.baseUrl}/api/veterinarians`,
      request,
    );
  }

  createReceptionist(
    request: ReceptionistCreateRequest,
  ): Observable<CreatedUserResponse> {
    return this.http.post<CreatedUserResponse>(
      `${this.baseUrl}/api/receptionists`,
      request,
    );
  }
}
