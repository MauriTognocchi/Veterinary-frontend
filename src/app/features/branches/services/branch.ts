import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BranchRequest, BranchResponse } from '../models/branch.model';

@Injectable({ providedIn: 'root' })
export class BranchService {
  private readonly baseUrl = 'http://localhost:8080';
  private http = inject(HttpClient);

  getAll(): Observable<BranchResponse[]> {
    return this.http.get<BranchResponse[]>(`${this.baseUrl}/api/branches`);
  }

  getById(externalId: string): Observable<BranchResponse> {
    return this.http.get<BranchResponse>(
      `${this.baseUrl}/api/branches/${encodeURIComponent(externalId)}`,
    );
  }

  create(branch: BranchRequest): Observable<BranchResponse> {
    return this.http.post<BranchResponse>(
      `${this.baseUrl}/api/branches`,
      branch,
    );
  }

  update(
    externalId: string,
    branch: BranchRequest,
  ): Observable<BranchResponse> {
    return this.http.put<BranchResponse>(
      `${this.baseUrl}/api/branches/${encodeURIComponent(externalId)}`,
      branch,
    );
  }

  delete(externalId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/api/branches/${encodeURIComponent(externalId)}`,
    );
  }
}
