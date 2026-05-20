import {
  Component, ChangeDetectionStrategy, OnInit,
  signal, computed, inject
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RoomService } from '../../../core/services/room.service';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReviewService } from '../../../core/services/review.service';
import { ViewingAppointmentService } from '../../../core/services/viewing-appointment.service';
import { BookingService } from '../../../core/services/booking.service';
import { Room, GENDER_LABELS, Review } from '../../../core/models';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/services/toast.service';

type ReviewUploadPreview = {
  file: File;
  url: string;
  kind: 'image' | 'video';
};

@Component({
  selector: 'app-room-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, DecimalPipe, FormsModule],
  templateUrl: './room-detail.component.html',
  styleUrls: ['./room-detail.component.scss']
})
export class RoomDetailComponent implements OnInit {
  private readonly apiUrl        = environment.apiUrl;
  private readonly route         = inject(ActivatedRoute);
  private readonly router        = inject(Router);
  private readonly roomService   = inject(RoomService);
  private readonly reviewService = inject(ReviewService);
  private readonly appointmentService = inject(ViewingAppointmentService);
  private readonly bookingService = inject(BookingService);
  private readonly chatService   = inject(ChatService);
  private readonly http          = inject(HttpClient);
  readonly auth                  = inject(AuthService);
  private readonly toast         = inject(ToastService);

  // â”€â”€ Room â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  room         = signal<Room | null>(null);
  recommendations = signal<Room[]>([]);
  activeIndex  = signal(0);
  descExpanded = signal(false);

  activeImage = computed(() => this.room()?.imageUrls[this.activeIndex()] ?? '');
  genderLabel = computed(() => this.room() ? GENDER_LABELS[this.room()!.genderRequirement] : '');

  // â”€â”€ Report â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  showReportModal = signal(false);
  selectedReason  = signal('');
  customReason    = signal('');
  reportSending   = signal(false);
  reportDone      = signal(false);
  reportError     = signal('');

  showAppointmentModal = signal(false);
  appointmentAt = signal('');
  appointmentMin = signal('');
  appointmentMessage = signal('');
  appointmentSending = signal(false);
  appointmentDone = signal(false);
  appointmentError = signal('');

  showBookingModal = signal(false);
  bookingFullName = signal('');
  bookingPhone = signal('');
  bookingEmail = signal('');
  bookingIdentityNumber = signal('');
  bookingMoveInDate = signal('');
  bookingLeaseMonths = signal(6);
  bookingOccupantCount = signal(1);
  bookingNote = signal('');
  bookingSending = signal(false);
  bookingError = signal('');

  readonly reportReasons = [
    'Thông tin sai lệch',
    'Phòng không còn trống nhưng vẫn đăng',
    'Hình ảnh không đúng thực tế',
    'Giá không đúng',
    'Tin đăng trùng lặp',
    'Nội dung vi phạm',
    'Khác',
  ];

  // â”€â”€ Review â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  reviews       = signal<Review[]>([]);
  myReview      = signal<Review | null>(null);
  showReviewForm = signal(false);
  editingReview  = signal(false);
  reviewRating   = signal(0);
  reviewHover    = signal(0);
  reviewComment  = '';
  reviewSaving   = signal(false);
  reviewMedia = signal<ReviewUploadPreview[]>([]);
  reviewMediaError = signal('');

  readonly subCriteria = [
    { key: 'location', label: 'Vị trí'  },
    { key: 'price',    label: 'Giá cả'  },
    { key: 'landlord', label: 'Chủ nhà' },
    { key: 'hygiene',  label: 'Vệ sinh' },
  ];

  private subRatings: Record<string, number> = {
    location: 0, price: 0, landlord: 0, hygiene: 0
  };

  // â”€â”€ Lifecycle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  ngOnInit(): void {
    this.route.paramMap.subscribe(p => {
      const id = Number(p.get('id'));
      if (!id) return;

      this.loadRoom(id);
      this.reviewService.getRoomReviews(id).subscribe(r => this.reviews.set(r.data));
      if (this.auth.isSeeker()) {
        this.reviewService.getMyReview(id).subscribe(r => this.myReview.set(r.data));
      }
    });
  }

  private loadRoom(id: number): void {
    this.roomService.getById(id).subscribe(r => {
      this.room.set(r.data);
      this.activeIndex.set(0);
    });
    this.roomService.getRecommendations(id).subscribe({
      next: r => this.recommendations.set(r.data),
      error: () => this.recommendations.set([])
    });
  }

  // â”€â”€ Gallery â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  setImage(i: number): void { this.activeIndex.set(i); }
  prevImage(): void {
    const len = this.room()?.imageUrls.length ?? 1;
    this.activeIndex.update(i => (i - 1 + len) % len);
  }
  nextImage(): void {
    const len = this.room()?.imageUrls.length ?? 1;
    this.activeIndex.update(i => (i + 1) % len);
  }
  toggleDesc(): void { this.descExpanded.update(v => !v); }

  // â”€â”€ Favorite â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  toggleFav(): void {
    if (!this.auth.isLoggedIn()) { this.router.navigate(['/auth/login']); return; }
    const r = this.room();
    if (!r) return;
    this.roomService.toggleFavorite(r.id).subscribe(res => {
      this.room.update(prev => prev ? { ...prev, isFavorited: res.data } : null);
    });
  }

  // â”€â”€ Chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  openChat(): void {
    const r = this.room();
    if (!r) return;
    if (!this.auth.isLoggedIn()) { this.router.navigate(['/auth/login']); return; }
    this.chatService.openChat(r.id).subscribe((res: any) => {
      this.router.navigate(['/chat'], { queryParams: { chatId: res.data.id } });
    });
  }

  openAppointment(): void {
    if (!this.auth.isLoggedIn()) { this.router.navigate(['/auth/login']); return; }
    this.showAppointmentModal.set(true);
    this.appointmentMin.set(this.toDateTimeLocalValue(new Date()));
    this.appointmentAt.set('');
    this.appointmentMessage.set('');
    this.appointmentError.set('');
    this.appointmentDone.set(false);
  }

  openBooking(): void {
    if (!this.auth.isLoggedIn()) { this.router.navigate(['/auth/login']); return; }
    this.showBookingModal.set(true);
    this.bookingFullName.set(this.auth.user()?.fullName ?? '');
    this.bookingPhone.set(this.auth.user()?.phone ?? '');
    this.bookingEmail.set(this.auth.user()?.email ?? '');
    this.bookingIdentityNumber.set('');
    this.bookingMoveInDate.set(this.toDateValue(new Date()));
    this.bookingLeaseMonths.set(6);
    this.bookingOccupantCount.set(1);
    this.bookingNote.set('');
    this.bookingError.set('');
  }

  submitBooking(): void {
    const r = this.room();
    if (!r) return;
    if (!this.bookingFullName().trim() || !this.bookingPhone().trim()) {
      this.bookingError.set('Vui lòng nhập họ tên và số điện thoại');
      return;
    }
    if (!this.bookingMoveInDate()) {
      this.bookingError.set('Vui lòng chọn ngày dự kiến vào ở');
      return;
    }
    if (this.bookingOccupantCount() > r.maxPeople) {
      this.bookingError.set(`Số người ở không được vượt quá ${r.maxPeople}`);
      return;
    }

    this.bookingSending.set(true);
    this.bookingService.create(r.id, {
      tenantFullName: this.bookingFullName().trim(),
      tenantPhone: this.bookingPhone().trim(),
      tenantEmail: this.bookingEmail().trim() || undefined,
      tenantIdentityNumber: this.bookingIdentityNumber().trim() || undefined,
      moveInDate: this.bookingMoveInDate(),
      leaseMonths: this.bookingLeaseMonths(),
      occupantCount: this.bookingOccupantCount(),
      note: this.bookingNote().trim() || undefined
    }).subscribe({
      next: res => {
        this.bookingSending.set(false);
        this.showBookingModal.set(false);
        this.toast.success('Đã tạo yêu cầu thuê phòng');
        this.router.navigate(['/bookings', res.data.id]);
      },
      error: e => {
        this.bookingError.set(e.error?.message ?? 'Không tạo được yêu cầu thuê phòng');
        this.bookingSending.set(false);
      }
    });
  }

  submitAppointment(): void {
    const r = this.room();
    if (!r) return;
    const requestedAt = this.normalizeDateTimeLocal(this.appointmentAt());
    if (!requestedAt) {
      this.appointmentError.set('Vui lòng chọn thời gian muốn xem phòng');
      return;
    }
    if (!this.isFutureDateTime(requestedAt)) {
      this.appointmentError.set('Vui lòng chọn thời gian trong tương lai');
      return;
    }
    this.appointmentSending.set(true);
    this.appointmentService.create(r.id, {
      requestedAt,
      message: this.appointmentMessage().trim()
    }).subscribe({
      next: () => {
        this.appointmentSending.set(false);
        this.appointmentDone.set(true);
        this.toast.success('Đã gửi yêu cầu xem phòng');
      },
      error: e => {
        this.appointmentError.set(e.error?.message ?? 'Gửi yêu cầu thất bại');
        this.appointmentError.set(this.getAppointmentErrorMessage(e));
        this.appointmentSending.set(false);
      }
    });
  }

  private normalizeDateTimeLocal(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';
    return trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  }

  private isFutureDateTime(value: string): boolean {
    const requestedAt = new Date(value);
    return !Number.isNaN(requestedAt.getTime()) && requestedAt.getTime() > Date.now();
  }

  private toDateTimeLocalValue(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private toDateValue(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join('-');
  }

  private getAppointmentErrorMessage(error: any): string {
    return error?.error?.data?.requestedAt
      ?? error?.error?.message
      ?? 'Gửi yêu cầu thất bại';
  }

  goToRoom(id: number): void {
    this.router.navigate(['/rooms', id]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // â”€â”€ Report â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  finalReason(): string {
    return this.selectedReason() === 'Khác'
      ? this.customReason().trim()
      : this.selectedReason();
  }

  openReport(): void {
    if (!this.auth.isLoggedIn()) { this.router.navigate(['/auth/login']); return; }
    this.showReportModal.set(true);
    this.selectedReason.set('');
    this.customReason.set('');
    this.reportError.set('');
    this.reportDone.set(false);
  }

  submitReport(): void {
    const r = this.room();
    if (!r) return;
    const reason = this.finalReason();
    if (!reason) {
      this.reportError.set(
        this.selectedReason() === 'Khác' ? 'Vui lòng mô tả chi tiết' : 'Vui lòng chọn lý do'
      );
      return;
    }
    this.reportSending.set(true);
    this.http.post<any>(`${this.apiUrl}/api/rooms/${r.id}/report`, { reason }).subscribe({
      next:  () => { this.reportSending.set(false); this.reportDone.set(true); },
      error: e => { this.reportError.set(e.error?.message ?? 'Gửi thất bại'); this.reportSending.set(false); }
    });
  }

  // â”€â”€ Review helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  starLabel(): string {
    const labels = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Rất tốt'];
    return labels[this.reviewHover() || this.reviewRating()] ?? '';
  }

  starsDisplay(n: number): string {
    return '⭐'.repeat(n) + '☆'.repeat(5 - n);
  }

  getRatingPercent(star: number): number {
    const total = this.reviews().length;
    if (!total) return 0;
    return Math.round(this.reviews().filter(r => r.rating === star).length / total * 100);
  }

  getRatingCount(star: number): number {
    return this.reviews().filter(r => r.rating === star).length;
  }

  getSubRating(key: string): number {
    return this.subRatings[key] ?? 0;
  }

  setSubRating(key: string, val: number): void {
    this.subRatings[key] = val;
  }

  getReviewSubRating(review: Review, key: string): number {
    const map: Record<string, number | undefined> = {
      location: review.ratingLocation,
      price:    review.ratingPrice,
      landlord: review.ratingLandlord,
      hygiene:  review.ratingHygiene,
    };
    return map[key] ?? 0;
  }

  isImageMedia(type: string): boolean {
    return type === 'IMAGE';
  }

  onReviewMediaSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const selectedFiles = Array.from(input?.files ?? []);
    if (!selectedFiles.length) return;

    const existing = this.reviewMedia();
    if (existing.length + selectedFiles.length > 6) {
      this.reviewMediaError.set('Tối đa 6 ảnh hoặc video cho mỗi đánh giá');
      if (input) input.value = '';
      return;
    }

    const invalidFile = selectedFiles.find(file => {
      const type = file.type;
      return !(type.startsWith('image/') || type.startsWith('video/'));
    });
    if (invalidFile) {
      this.reviewMediaError.set('Chỉ hỗ trợ ảnh hoặc video');
      if (input) input.value = '';
      return;
    }

    const previews = selectedFiles.map(file => ({
      file,
      url: URL.createObjectURL(file),
      kind: file.type.startsWith('video/') ? 'video' as const : 'image' as const
    }));

    this.reviewMediaError.set('');
    this.reviewMedia.set([...existing, ...previews]);
    if (input) input.value = '';
  }

  removeReviewMedia(index: number): void {
    const next = [...this.reviewMedia()];
    const [removed] = next.splice(index, 1);
    if (removed) {
      URL.revokeObjectURL(removed.url);
    }
    this.reviewMedia.set(next);
  }

  mediaTrackBy(index: number): number {
    return index;
  }

  private buildReviewPayload(): FormData {
    const payload = new FormData();
    payload.append('rating', String(this.reviewRating()));
    payload.append('comment', this.reviewComment);

    const appendNullable = (key: string, value: number) => {
      if (value > 0) payload.append(key, String(value));
    };

    appendNullable('ratingLocation', this.subRatings['location'] || 0);
    appendNullable('ratingPrice', this.subRatings['price'] || 0);
    appendNullable('ratingLandlord', this.subRatings['landlord'] || 0);
    appendNullable('ratingHygiene', this.subRatings['hygiene'] || 0);

    for (const media of this.reviewMedia()) {
      payload.append('files', media.file);
    }

    return payload;
  }

  private clearReviewMedia(): void {
    for (const media of this.reviewMedia()) {
      URL.revokeObjectURL(media.url);
    }
    this.reviewMedia.set([]);
    this.reviewMediaError.set('');
  }

  private resetReviewForm(): void {
    this.reviewRating.set(0);
    this.reviewHover.set(0);
    this.reviewComment = '';
    this.subRatings = { location: 0, price: 0, landlord: 0, hygiene: 0 };
    this.clearReviewMedia();
  }

  cancelReview(): void {
    this.showReviewForm.set(false);
    this.resetReviewForm();
  }

  // â”€â”€ Review CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  submitReview(): void {
    const r = this.room();
    if (!r || this.reviewRating() === 0) return;
    this.reviewSaving.set(true);
    this.reviewService.createReview(r.id, this.buildReviewPayload()).subscribe({
      next: res => {
        this.myReview.set(res.data);
        this.reviews.update(list => [res.data, ...list]);
        this.showReviewForm.set(false);
        this.resetReviewForm();
        this.reviewSaving.set(false);
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Lỗi gửi đánh giá');
        this.reviewSaving.set(false);
      }
    });
  }

  editMyReview(): void {
    const r = this.myReview();
    if (!r) return;
    this.reviewRating.set(r.rating);
    this.reviewComment = r.comment ?? '';
    this.subRatings = {
      location: r.ratingLocation ?? 0,
      price:    r.ratingPrice    ?? 0,
      landlord: r.ratingLandlord ?? 0,
      hygiene:  r.ratingHygiene  ?? 0,
    };
    this.clearReviewMedia();
    this.editingReview.set(true);
  }

  saveEditReview(): void {
    const r = this.myReview();
    if (!r) return;
    this.reviewSaving.set(true);
    this.reviewService.updateReview(r.id, this.buildReviewPayload()).subscribe({
      next: res => {
        this.myReview.set(res.data);
        this.reviews.update(list => list.map(rv => rv.id === res.data.id ? res.data : rv));
        this.editingReview.set(false);
        this.resetReviewForm();
        this.reviewSaving.set(false);
        this.toast.success('Đã cập nhật đánh giá');
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không thể cập nhật đánh giá');
        this.reviewSaving.set(false);
      }
    });
  }

  deleteMyReview(): void {
    const r = this.myReview();
    if (!r || !confirm('Xoá đánh giá này?')) return;
    this.reviewService.deleteReview(r.id).subscribe(() => {
      this.reviews.update(list => list.filter(rv => rv.id !== r.id));
      this.myReview.set(null);
      this.resetReviewForm();
      this.toast.success('Đã xoá đánh giá');
    });
  }
}
