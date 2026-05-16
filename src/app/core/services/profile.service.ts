import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, User } from '../models';

export interface ProfileStats {
  totalFavorites: number;
  totalAppointments: number;
  totalBookings: number;
  totalRooms: number;
  totalViews: number;
}

export interface UpdateProfileRequest {
  fullName: string;
  phone: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly API  = '/api/profile';
  private readonly http = inject(HttpClient);

  getProfile(): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(this.API);
  }

  updateProfile(data: UpdateProfileRequest): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(this.API, data);
  }

  changePassword(data: ChangePasswordRequest): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.API}/password`, data);
  }

  uploadAvatar(file: File): Observable<ApiResponse<string>> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ApiResponse<string>>(`${this.API}/avatar`, form);
  }

  getStats(): Observable<ApiResponse<ProfileStats>> {
    return this.http.get<ApiResponse<ProfileStats>>(`${this.API}/stats`);
  }
}
