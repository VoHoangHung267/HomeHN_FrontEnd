import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models';
import { environment } from '../../../environments/environment';

export interface GlobalAssistantResult {
  answer: string;
  note?: string | null;
  actionLabel?: string | null;
  actionUrl?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AiAssistantService {
  private readonly API = `${environment.apiUrl}/api/ai`;
  private readonly http = inject(HttpClient);

  ask(question: string): Observable<ApiResponse<GlobalAssistantResult>> {
    return this.http.post<ApiResponse<GlobalAssistantResult>>(`${this.API}/assistant`, { question });
  }
}
