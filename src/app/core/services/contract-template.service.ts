import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, ContractTemplate } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ContractTemplateService {
  private readonly API = `${environment.apiUrl}/api/bookings/contract-templates`;
  private readonly http = inject(HttpClient);

  getMine(): Observable<ApiResponse<ContractTemplate[]>> {
    return this.http.get<ApiResponse<ContractTemplate[]>>(this.API);
  }

  create(payload: {
    name: string;
    defaultMonthlyRent?: number;
    defaultDepositAmount?: number;
    defaultElectricPrice?: number;
    defaultWaterPrice?: number;
    defaultOtherFees?: number;
    moveInRules: string;
    serviceNotes: string;
    additionalTerms?: string;
  }): Observable<ApiResponse<ContractTemplate>> {
    return this.http.post<ApiResponse<ContractTemplate>>(this.API, payload);
  }

  update(id: number, payload: {
    name: string;
    defaultMonthlyRent?: number;
    defaultDepositAmount?: number;
    defaultElectricPrice?: number;
    defaultWaterPrice?: number;
    defaultOtherFees?: number;
    moveInRules: string;
    serviceNotes: string;
    additionalTerms?: string;
  }): Observable<ApiResponse<ContractTemplate>> {
    return this.http.put<ApiResponse<ContractTemplate>>(`${this.API}/${id}`, payload);
  }
}
