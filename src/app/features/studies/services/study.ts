import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  StudyByVisitRequest,
  StudyByVisitResponse,
  StudyResponse,
} from '../models/study.model';

@Injectable({ providedIn: 'root' })
export class StudyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api';

  getAll(): Observable<StudyResponse[]> {
    return this.http.get<StudyResponse[]>(`${this.baseUrl}/studies`);
  }

  getAssociations(): Observable<StudyByVisitResponse[]> {
    return this.http.get<StudyByVisitResponse[]>(
      `${this.baseUrl}/studies-by-visits`,
    );
  }

  associate(request: StudyByVisitRequest): Observable<StudyByVisitResponse> {
    return this.http.post<StudyByVisitResponse>(
      `${this.baseUrl}/studies-by-visits`,
      request,
    );
  }

  deactivateAssociation(externalId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/studies-by-visits/${encodeURIComponent(externalId)}`,
    );
  }
}
