import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BranchResponse } from '../models/branch.model';

@Injectable({ providedIn: 'root' })
export class BranchService {
  private readonly baseUrl = 'http://localhost:8080';
  private http = inject(HttpClient);

  getAll(): Observable<BranchResponse[]> {
    return this.http.get<BranchResponse[]>(`${this.baseUrl}/api/branches`);
  }
}
