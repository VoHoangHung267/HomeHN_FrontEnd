import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DecimalPipe, KeyValuePipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { AiSearchResult, RoomService } from '../../../core/services/room.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  DISTRICTS_HN,
  GENDER_LABELS,
  GenderRequirement,
  Room,
  RoomFilter,
  ROOM_TYPE_LABELS,
  RoomType
} from '../../../core/models';

@Component({
  selector: 'app-room-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DecimalPipe, KeyValuePipe],
  templateUrl: './room-list.component.html',
  styleUrls: ['./room-list.component.scss']
})
export class RoomListComponent implements OnInit {
  private readonly roomService = inject(RoomService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  rooms = signal<Room[]>([]);
  loading = signal(false);
  totalElements = signal(0);
  totalPages = signal(0);
  currentPage = signal(0);
  aiSearchLoading = signal(false);
  aiSearchNote = signal('');
  aiSearchError = signal('');
  aiSearchQuery = '';

  filter: RoomFilter = { size: 12, sortBy: 'createdAt' };
  readonly districts = DISTRICTS_HN;
  readonly roomTypes = ROOM_TYPE_LABELS;
  readonly skeletons = Array(8);

  pageNumbers = computed(() => {
    const cur = this.currentPage();
    const total = this.totalPages();
    const start = Math.max(0, cur - 2);
    const end = Math.min(total - 1, cur + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  activeFilters = computed(() => {
    const f = this.filter;
    const out: { key: string; label: string }[] = [];
    if (f.keyword) out.push({ key: 'keyword', label: `"${f.keyword}"` });
    if (f.district) out.push({ key: 'district', label: f.district });
    if (f.roomType) out.push({ key: 'roomType', label: ROOM_TYPE_LABELS[f.roomType as RoomType] });
    if (f.minPrice) out.push({ key: 'minPrice', label: `Từ ${f.minPrice?.toLocaleString('vi-VN')}đ` });
    if (f.maxPrice) out.push({ key: 'maxPrice', label: `Đến ${f.maxPrice?.toLocaleString('vi-VN')}đ` });
    if (f.minArea) out.push({ key: 'minArea', label: `Từ ${f.minArea}m²` });
    if (f.maxArea) out.push({ key: 'maxArea', label: `Đến ${f.maxArea}m²` });
    if (f.isFurnished) out.push({ key: 'isFurnished', label: 'Có nội thất' });
    if (f.genderRequirement) out.push({ key: 'genderRequirement', label: GENDER_LABELS[f.genderRequirement as GenderRequirement] });
    return out;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.roomService.searchRooms({ ...this.filter, page: this.currentPage() }).subscribe({
      next: r => {
        this.rooms.set(r.data.content);
        this.totalElements.set(r.data.totalElements);
        this.totalPages.set(r.data.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  applyFilter(): void {
    this.currentPage.set(0);
    this.load();
  }

  applyAiSearch(): void {
    this.aiSearchError.set('');
    this.aiSearchNote.set('');

    if (!this.aiSearchQuery.trim()) {
      this.toast.error('Vui lòng nhập nhu cầu tìm phòng trước khi dùng AI.');
      return;
    }

    this.aiSearchLoading.set(true);
    this.roomService.parseAiSearch({ query: this.aiSearchQuery.trim() }).subscribe({
      next: r => {
        this.applyAiSearchResult(r.data);
        this.aiSearchNote.set(r.data.note?.trim() || 'AI đã hiểu nhu cầu và áp dụng bộ lọc tương ứng.');
        this.aiSearchLoading.set(false);
        this.applyFilter();
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không thể phân tích nhu cầu tìm phòng lúc này.');
        this.aiSearchLoading.set(false);
      }
    });
  }

  resetFilter(): void {
    this.filter = { size: 12, sortBy: 'createdAt' };
    this.aiSearchNote.set('');
    this.aiSearchError.set('');
    this.currentPage.set(0);
    this.load();
  }

  removeFilter(key: string): void {
    (this.filter as Record<string, unknown>)[key] = undefined;
    this.applyFilter();
  }

  changePage(p: number): void {
    if (p < 0 || p >= this.totalPages()) return;
    this.currentPage.set(p);
    this.load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goToDetail(id: number): void {
    this.router.navigate(['/rooms', id]);
  }

  toggleFav(event: Event, room: Room): void {
    event.stopPropagation();
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.roomService.toggleFavorite(room.id).subscribe(r => {
      this.rooms.update(list =>
        list.map(item => item.id === room.id ? { ...item, favorited: r.data.favorited } : item)
      );
    });
  }

  roomTypeLabel(t: RoomType): string {
    return ROOM_TYPE_LABELS[t] ?? t;
  }

  genderLabel(g: GenderRequirement): string {
    return GENDER_LABELS[g] ?? g;
  }

  private applyAiSearchResult(data: AiSearchResult): void {
    this.filter = {
      ...this.filter,
      keyword: data.keyword?.trim() || undefined,
      district: data.district?.trim() || undefined,
      minPrice: data.minPrice ?? undefined,
      maxPrice: data.maxPrice ?? undefined,
      minArea: data.minArea ?? undefined,
      maxArea: data.maxArea ?? undefined,
      roomType: data.roomType ?? undefined,
      isFurnished: data.isFurnished ?? undefined,
      genderRequirement: data.genderRequirement ?? undefined,
      sortBy: data.sortBy ?? 'createdAt'
    };
  }
}
