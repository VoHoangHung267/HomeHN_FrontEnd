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
  readonly priceMinLimit = 0;
  readonly priceMaxLimit = 20_000_000;
  readonly priceStep = 100_000;

  pageNumbers = computed(() => {
    const cur = this.currentPage();
    const total = this.resolvedTotalPages();
    const start = Math.max(0, cur - 2);
    const end = Math.min(total - 1, cur + 2);
    const length = Math.max(0, end - start + 1);
    return Array.from({ length }, (_, i) => start + i);
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
        this.totalPages.set(this.calculateTotalPages(r.data.totalPages, r.data.totalElements, r.data.size));
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
    if (p < 0 || p >= this.resolvedTotalPages()) return;
    this.currentPage.set(p);
    this.load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  paginationLabel(): string {
    const total = this.resolvedTotalPages();
    if (total === 0) return 'Trang 0 / 0';
    return `Trang ${this.currentPage() + 1} / ${total}`;
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

  onMinPriceChange(value: number): void {
    const next = this.normalizePrice(value);
    const currentMax = this.filter.maxPrice ?? this.priceMaxLimit;
    this.filter = {
      ...this.filter,
      minPrice: Math.min(next, currentMax)
    };
  }

  onMaxPriceChange(value: number): void {
    const next = this.normalizePrice(value);
    const currentMin = this.filter.minPrice ?? this.priceMinLimit;
    this.filter = {
      ...this.filter,
      maxPrice: Math.max(next, currentMin)
    };
  }

  priceLabel(value: number | undefined, fallback: string): string {
    if (value === undefined || value === null) return fallback;
    return `${value.toLocaleString('vi-VN')}đ`;
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

  private normalizePrice(value: number): number {
    if (!Number.isFinite(value)) return this.priceMinLimit;
    const clamped = Math.min(this.priceMaxLimit, Math.max(this.priceMinLimit, value));
    return Math.round(clamped / this.priceStep) * this.priceStep;
  }

  private resolvedTotalPages(): number {
    return this.calculateTotalPages(this.totalPages(), this.totalElements(), this.filter.size);
  }

  private calculateTotalPages(totalPages: number | undefined, totalElements: number | undefined, pageSize: number | undefined): number {
    if (Number.isFinite(totalPages) && Number(totalPages) > 0) {
      return Number(totalPages);
    }
    const safeSize = Number(pageSize) || this.filter.size || 1;
    const safeTotalElements = Number(totalElements) || 0;
    return safeTotalElements > 0 ? Math.ceil(safeTotalElements / safeSize) : 0;
  }
}
