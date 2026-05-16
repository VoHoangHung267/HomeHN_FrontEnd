import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, Page, Room, User } from '../models';
import { environment } from '../../../environments/environment';

export interface StatsResponse {
  totalUsers: number;
  totalRooms: number;
  pendingRooms: number;
  totalReports: number;
}

export interface ReportItem {
  id: number;
  roomId: number;
  roomTitle: string;
  reporterName: string;
  reporterEmail: string; 
  reason: string;
  status: 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';
  adminNote: string; 
  landlordResponseType?: 'WILL_FIX' | 'CONTEST';
  landlordResponseNote?: string;
  landlordRespondedAt?: string;
  createdAt: string;
}

export interface AdminRoomFilter {
  keyword?: string; 
  district?: string; 
  status?: string;
  landlordId?: number; 
  page?: number; 
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly API  = `${environment.apiUrl}/api/admin`;
  private readonly http = inject(HttpClient);

  getStats():         Observable<ApiResponse<StatsResponse>>   { return this.http.get<ApiResponse<StatsResponse>>(`${this.API}/stats`); }
  getPendingRooms():  Observable<ApiResponse<Room[]>>           { return this.http.get<ApiResponse<Room[]>>(`${this.API}/rooms/pending`); }
  getAllUsers():       Observable<ApiResponse<User[]>>           { return this.http.get<ApiResponse<User[]>>(`${this.API}/users`); }

  approveRoom(id: number):                     Observable<ApiResponse<void>> { return this.http.patch<ApiResponse<void>>(`${this.API}/rooms/${id}/approve`, {}); }
  rejectRoom(id: number, reason: string):      Observable<ApiResponse<void>> { return this.http.patch<ApiResponse<void>>(`${this.API}/rooms/${id}/reject`, { reason }); }
  toggleUserActive(id: number):                Observable<ApiResponse<void>> { return this.http.patch<ApiResponse<void>>(`${this.API}/users/${id}/toggle-active`, {}); }
  toggleHiddenRoom(id: number):                Observable<ApiResponse<void>> { return this.http.patch<ApiResponse<void>>(`${this.API}/rooms/${id}/toggle-hidden`, {}); }
  deleteRoom(id: number):                      Observable<ApiResponse<void>> { return this.http.delete<ApiResponse<void>>(`${this.API}/rooms/${id}`); }

  getAllRooms(filter: AdminRoomFilter): Observable<ApiResponse<Page<Room>>> {
    let params = new HttpParams();
    Object.entries(filter).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<ApiResponse<Page<Room>>>(`${this.API}/rooms/all`, { params });
  }

  getReports(status = 'PENDING'): Observable<ApiResponse<ReportItem[]>> {
    return this.http.get<ApiResponse<ReportItem[]>>(`${this.API}/reports`, { params: { status } });
  }

  getReport(id: number): Observable<ApiResponse<ReportItem>> {
    return this.http.get<ApiResponse<ReportItem>>(`${this.API}/reports/${id}`);
  }

  resolveReport(id: number, note: string, status: string): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.API}/reports/${id}/resolve`, { note, status });
  }
}
