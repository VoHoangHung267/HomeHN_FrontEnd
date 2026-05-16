import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models';
import { ReportItem } from './admin.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly API = `${environment.apiUrl}/api/reports`;
  private readonly http = inject(HttpClient);

  getDetail(id: number): Observable<ApiResponse<ReportItem>> {
    return this.http.get<ApiResponse<ReportItem>>(`${this.API}/${id}`);
  }

  submitLandlordResponse(
    id: number,
    responseType: 'WILL_FIX' | 'CONTEST',
    responseNote: string
  ): Observable<ApiResponse<ReportItem>> {
    return this.http.patch<ApiResponse<ReportItem>>(`${this.API}/${id}/landlord-response`, {
      responseType,
      responseNote
    });
  }
}
