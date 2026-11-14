import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserResponse } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly baseUrl = 'http://localhost:8080';
  private http = inject(HttpClient);

  getAll(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(`${this.baseUrl}/api/users`);
  }

  getById(externalId: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(
      `${this.baseUrl}/api/users/${encodeURIComponent(externalId)}`,
    );
  }

  deactivate(externalId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/api/users/${encodeURIComponent(externalId)}`,
    );
  }

  reactivate(externalId: string): Observable<void> {
    return this.http.patch<void>(
      `${this.baseUrl}/api/users/${encodeURIComponent(externalId)}/reactivate`,
      null,
    );
  }
}
