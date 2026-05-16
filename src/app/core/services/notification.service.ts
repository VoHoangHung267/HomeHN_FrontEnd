import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, NotificationItem } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly API  = `${environment.apiUrl}/api/notifications`;
  private readonly http = inject(HttpClient);

  readonly unreadCount = signal(0);

  getAll(): Observable<ApiResponse<NotificationItem[]>> {
    return this.http.get<ApiResponse<NotificationItem[]>>(this.API);
  }

  fetchUnreadCount(): void {
    this.http.get<ApiResponse<number>>(`${this.API}/unread-count`).subscribe(r => {
      this.unreadCount.set(r.data);
    });
  }

  readAll(): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.API}/read-all`, {});
  }

  readOne(id: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.API}/${id}/read`, {});
  }
}
