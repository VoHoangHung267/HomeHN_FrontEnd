import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, GenderRequirement, Page, Room, RoomFilter, RoomFormData, RoomType } from '../models';
import { environment } from '../../../environments/environment';

export interface GenerateRoomDescriptionPayload {
  title?: string;
  currentDescription?: string;
  price?: number | null;
  area?: number | null;
  electricPrice?: number | null;
  waterPrice?: number | null;
  otherFees?: number | null;
  address?: string;
  ward?: string;
  district?: string;
  city?: string;
  roomType?: RoomType;
  isFurnished?: boolean;
  maxPeople?: number;
  genderRequirement?: GenderRequirement;
  amenities?: string[];
}

export interface GenerateRoomDescriptionResult {
  suggestedTitle: string;
  suggestedDescription: string;
}

export interface ExtractRoomFormPayload {
  rawDescription: string;
}

export interface ExtractRoomFormResult {
  title?: string | null;
  description?: string | null;
  price?: number | null;
  area?: number | null;
  electricPrice?: number | null;
  waterPrice?: number | null;
  otherFees?: number | null;
  address?: string | null;
  ward?: string | null;
  district?: string | null;
  city?: string | null;
  roomType?: RoomType | null;
  isFurnished?: boolean | null;
  maxPeople?: number | null;
  genderRequirement?: GenderRequirement | null;
  amenities?: string[] | null;
  note?: string | null;
}

export interface AiSearchPayload {
  query: string;
}

export interface AiSearchResult {
  keyword?: string | null;
  district?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  minArea?: number | null;
  maxArea?: number | null;
  roomType?: RoomType | null;
  isFurnished?: boolean | null;
  genderRequirement?: GenderRequirement | null;
  sortBy?: RoomFilter['sortBy'] | null;
  note?: string | null;
}

@Injectable({ providedIn: 'root' })
export class RoomService {
  private readonly API = `${environment.apiUrl}/api/rooms`;
  private readonly http = inject(HttpClient);

  searchRooms(filter: RoomFilter): Observable<ApiResponse<Page<Room>>> {
    let params = new HttpParams();
    (Object.entries(filter) as [string, unknown][]).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') {
        params = params.set(k, String(v));
      }
    });
    return this.http.get<ApiResponse<Page<Room>>>(this.API, { params });
  }

  getById(id: number): Observable<ApiResponse<Room>> {
    return this.http.get<ApiResponse<Room>>(`${this.API}/${id}`);
  }

  getRecommendations(id: number): Observable<ApiResponse<Room[]>> {
    return this.http.get<ApiResponse<Room[]>>(`${this.API}/${id}/recommendations`);
  }

  createRoom(data: RoomFormData): Observable<ApiResponse<Room>> {
    return this.http.post<ApiResponse<Room>>(this.API, data);
  }

  updateRoom(id: number, data: RoomFormData): Observable<ApiResponse<Room>> {
    return this.http.put<ApiResponse<Room>>(`${this.API}/${id}`, data);
  }

  generateListingCopy(
    payload: GenerateRoomDescriptionPayload
  ): Observable<ApiResponse<GenerateRoomDescriptionResult>> {
    return this.http.post<ApiResponse<GenerateRoomDescriptionResult>>(
      `${this.API}/ai/generate-description`,
      payload
    );
  }

  extractRoomForm(
    payload: ExtractRoomFormPayload
  ): Observable<ApiResponse<ExtractRoomFormResult>> {
    return this.http.post<ApiResponse<ExtractRoomFormResult>>(
      `${this.API}/ai/extract-room-form`,
      payload
    );
  }

  parseAiSearch(
    payload: AiSearchPayload
  ): Observable<ApiResponse<AiSearchResult>> {
    return this.http.post<ApiResponse<AiSearchResult>>(
      `${this.API}/ai/parse-search`,
      payload
    );
  }

  updateRoomStatus(id: number, status: Room['status']): Observable<ApiResponse<Room>> {
    return this.http.patch<ApiResponse<Room>>(`${this.API}/${id}/status?status=${status}`, {});
  }

  deleteRoom(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API}/${id}`);
  }

  uploadImages(roomId: number, files: File[]): Observable<ApiResponse<void>> {
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    return this.http.post<ApiResponse<void>>(`${this.API}/${roomId}/images`, form);
  }

  toggleFavorite(roomId: number): Observable<ApiResponse<{ favorited: boolean }>> {
    return this.http.post<ApiResponse<{ favorited: boolean }>>(
      `${this.API}/${roomId}/favorite`, {}
    );
  }

  getMyRooms(): Observable<ApiResponse<Room[]>> {
    return this.http.get<ApiResponse<Room[]>>(`${this.API}/my-rooms`);
  }

  getMyFavorites(): Observable<ApiResponse<Room[]>> {
    return this.http.get<ApiResponse<Room[]>>(`${this.API}/favorites`);
  }
}
