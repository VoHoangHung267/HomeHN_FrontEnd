import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, ContractAdjustment, ContractAdjustmentStatus } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ContractAdjustmentService {
  private readonly API = `${environment.apiUrl}/api/bookings`;
  private readonly http = inject(HttpClient);

  getByBooking(bookingId: number): Observable<ApiResponse<ContractAdjustment[]>> {
    return this.http.get<ApiResponse<ContractAdjustment[]>>(`${this.API}/${bookingId}/adjustments`);
  }

  create(bookingId: number, payload: {
    extensionMonths?: number;
    proposedMonthlyRent?: number;
    proposedDepositAmount?: number;
    proposedElectricPrice?: number;
    proposedWaterPrice?: number;
    proposedOtherFees?: number;
    proposedContractTerms?: string;
    proposedMoveInRules?: string;
    proposedServiceNotes?: string;
    proposedAdditionalTerms?: string;
    proposalNote?: string;
  }): Observable<ApiResponse<ContractAdjustment>> {
    return this.http.post<ApiResponse<ContractAdjustment>>(`${this.API}/${bookingId}/adjustments`, payload);
  }

  updateStatus(adjustmentId: number, payload: {
    status: Extract<ContractAdjustmentStatus, 'APPROVED' | 'REJECTED'>;
    responseNote?: string;
  }): Observable<ApiResponse<ContractAdjustment>> {
    return this.http.patch<ApiResponse<ContractAdjustment>>(`${this.API}/adjustments/${adjustmentId}/status`, payload);
  }
}
