import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, RentalBooking } from '../models';
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
    paymentMethod: 'VNPAY' | 'CASH';
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

  refreshPaymentLink(id: number): Observable<ApiResponse<RentalBooking>> {
    return this.http.post<ApiResponse<RentalBooking>>(`${this.API}/${id}/vnpay/refresh`, {});
  }

  confirmCashDeposit(id: number, receiptNote: string): Observable<ApiResponse<RentalBooking>> {
    return this.http.patch<ApiResponse<RentalBooking>>(`${this.API}/${id}/confirm-cash-deposit`, { receiptNote });
  }

  requestRenewal(id: number, payload: { leaseMonths: number; note?: string }): Observable<ApiResponse<RentalBooking>> {
    return this.http.patch<ApiResponse<RentalBooking>>(`${this.API}/${id}/request-renewal`, payload);
  }

  approveRenewal(id: number, payload: { leaseMonths: number; contractTerms?: string; note?: string }): Observable<ApiResponse<RentalBooking>> {
    return this.http.patch<ApiResponse<RentalBooking>>(`${this.API}/${id}/approve-renewal`, payload);
  }

  updateContractDraft(id: number, payload: {
    monthlyRent?: number;
    depositAmount?: number;
    electricPrice?: number;
    waterPrice?: number;
    otherFees?: number;
    moveInRules: string;
    serviceNotes: string;
    additionalTerms?: string;
  }): Observable<ApiResponse<RentalBooking>> {
    return this.http.patch<ApiResponse<RentalBooking>>(`${this.API}/${id}/contract-draft`, payload);
  }

  rejectRenewal(id: number, payload: { note?: string }): Observable<ApiResponse<RentalBooking>> {
    return this.http.patch<ApiResponse<RentalBooking>>(`${this.API}/${id}/reject-renewal`, payload);
  }

  landlordDecision(
    id: number,
    payload: { action: 'APPROVE' | 'REJECT'; note?: string }
  ): Observable<ApiResponse<RentalBooking>> {
    return this.http.patch<ApiResponse<RentalBooking>>(`${this.API}/${id}/landlord-status`, payload);
  }
}
