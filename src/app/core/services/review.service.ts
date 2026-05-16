import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, Review } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReviewService {
    private readonly API = `${environment.apiUrl}/api/reviews`;
    private readonly http = inject(HttpClient);

    getRoomReviews(roomId: number): Observable<ApiResponse<Review[]>> {
        return this.http.get<ApiResponse<Review[]>>(`${this.API}/room/${roomId}`);
    }

    getMyReview(roomId: number): Observable<ApiResponse<Review | null>> {
        return this.http.get<ApiResponse<Review | null>>(`${this.API}/room/${roomId}/my-review`);
    }

    createReview(roomId: number, payload: FormData): Observable<ApiResponse<Review>> {
        return this.http.post<ApiResponse<Review>>(`${this.API}/room/${roomId}`, payload);
    }

    updateReview(reviewId: number, payload: FormData): Observable<ApiResponse<Review>> {
        return this.http.put<ApiResponse<Review>>(`${this.API}/${reviewId}`, payload);
    }

    deleteReview(reviewId: number): Observable<ApiResponse<void>> {
        return this.http.delete<ApiResponse<void>>(`${this.API}/${reviewId}`);
    }
}
