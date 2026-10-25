import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { LoginRequest, LoginResponse } from '../models/auth.model';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // URL base temporal - debe confirmarse con la configuración real del backend
  private readonly baseUrl = 'http://localhost:8080';
  private http = inject(HttpClient);
  private tokenStorage = inject(TokenStorageService);

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/api/auth/login`, credentials).pipe(
      tap((response) => {
        if (response?.accessToken && response?.refreshToken) {
          this.tokenStorage.setTokens(response.accessToken, response.refreshToken);
        }
      })
    );
  }

  logout(): void {
    this.tokenStorage.clearTokens();
  }
}
