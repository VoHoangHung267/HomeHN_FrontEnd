import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, ViewingAppointment, ViewingAppointmentStatus } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ViewingAppointmentService {
  private readonly API = `${environment.apiUrl}/api/appointments`;
  private readonly http = inject(HttpClient);

  create(roomId: number, payload: { requestedAt: string; message?: string }): Observable<ApiResponse<ViewingAppointment>> {
    return this.http.post<ApiResponse<ViewingAppointment>>(`${this.API}/rooms/${roomId}`, payload);
  }

  getMyAppointments(): Observable<ApiResponse<ViewingAppointment[]>> {
    return this.http.get<ApiResponse<ViewingAppointment[]>>(`${this.API}/my`);
  }

  updateStatus(
    id: number,
    payload: { status: ViewingAppointmentStatus; requestedAt?: string; note?: string }
  ): Observable<ApiResponse<ViewingAppointment>> {
    return this.http.patch<ApiResponse<ViewingAppointment>>(`${this.API}/${id}/status`, payload);
  }

  cancel(id: number): Observable<ApiResponse<ViewingAppointment>> {
    return this.http.patch<ApiResponse<ViewingAppointment>>(`${this.API}/${id}/cancel`, {});
  }
}
