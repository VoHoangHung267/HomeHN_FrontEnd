import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, RentalBooking, RentalBookingStatus } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly API = `${environment.apiUrl}/api/bookings`;
  private readonly http = inject(HttpClient);

  create(roomId: number, payload: {
    tenantFullName: string;
    tenantPhone: string;
    tenantEmail?: string;
    tenantIdentityNumber?: string;
    moveInDate: string;
    leaseMonths: number;
    occupantCount: number;
    note?: string;
  }): Observable<ApiResponse<RentalBooking>> {
    return this.http.post<ApiResponse<RentalBooking>>(`${this.API}/rooms/${roomId}`, payload);
  }

  getMyBookings(): Observable<ApiResponse<RentalBooking[]>> {
    return this.http.get<ApiResponse<RentalBooking[]>>(`${this.API}/my`);
  }

  getLandlordBookings(): Observable<ApiResponse<RentalBooking[]>> {
    return this.http.get<ApiResponse<RentalBooking[]>>(`${this.API}/landlord`);
  }

  getById(id: number): Observable<ApiResponse<RentalBooking>> {
    return this.http.get<ApiResponse<RentalBooking>>(`${this.API}/${id}`);
  }

  cancel(id: number): Observable<ApiResponse<RentalBooking>> {
    return this.http.patch<ApiResponse<RentalBooking>>(`${this.API}/${id}/cancel`, {});
  }

  landlordDecision(
    id: number,
    payload: { status: Extract<RentalBookingStatus, 'CONFIRMED' | 'REJECTED'>; note?: string }
  ): Observable<ApiResponse<RentalBooking>> {
    return this.http.patch<ApiResponse<RentalBooking>>(`${this.API}/${id}/landlord-status`, payload);
  }
}
