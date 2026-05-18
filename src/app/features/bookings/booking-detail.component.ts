import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { RentalBooking, RentalBookingStatus } from '../../core/models';

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, DecimalPipe, FormsModule],
  templateUrl: './booking-detail.component.html',
  styleUrls: ['./booking-detail.component.scss']
})
export class BookingDetailComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly bookingService = inject(BookingService);

  booking = signal<RentalBooking | null>(null);
  loading = signal(false);
  error = signal('');
  info = signal('');
  decisionNote = '';
  decisionSaving = signal(false);
  paymentOpening = signal(false);

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (id) this.load(id);
    });

    this.route.queryParamMap.subscribe(params => {
      if (params.get('payment') === 'returned') {
        this.info.set(
          params.get('result') === 'success'
            ? 'Đã quay lại từ VNPAY. Hệ thống đang đồng bộ kết quả thanh toán cọc.'
            : 'Thanh toán qua VNPAY chưa thành công hoặc chưa được xác thực.'
        );
      }
    });
  }

  load(id: number): void {
    this.loading.set(true);
    this.error.set('');
    this.bookingService.getById(id).subscribe({
      next: r => {
        this.booking.set(r.data);
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e.error?.message ?? 'Không tải được chi tiết đơn thuê');
        this.loading.set(false);
      }
    });
  }

  openPayment(): void {
    const booking = this.booking();
    if (!booking || this.paymentOpening()) return;

    this.paymentOpening.set(true);
    this.error.set('');

    this.bookingService.refreshPaymentLink(booking.id).subscribe({
      next: r => {
        this.booking.set(r.data);
        this.paymentOpening.set(false);
        if (r.data.paymentPayUrl) {
          window.location.href = r.data.paymentPayUrl;
        } else {
          this.error.set('Không tạo được link thanh toán VNPAY');
        }
      },
      error: e => {
        this.error.set(e.error?.message ?? 'Không tạo được link thanh toán VNPAY');
        this.paymentOpening.set(false);
      }
    });
  }

  cancelBooking(): void {
    const booking = this.booking();
    if (!booking || !confirm('Xác nhận huỷ đơn thuê phòng này?')) return;
    this.bookingService.cancel(booking.id).subscribe({
      next: r => this.booking.set(r.data),
      error: e => this.error.set(e.error?.message ?? 'Không thể huỷ đơn thuê')
    });
  }

  landlordDecision(status: Extract<RentalBookingStatus, 'CONFIRMED' | 'REJECTED'>): void {
    const booking = this.booking();
    if (!booking) return;
    this.decisionSaving.set(true);
    this.bookingService.landlordDecision(booking.id, {
      status,
      note: this.decisionNote.trim()
    }).subscribe({
      next: r => {
        this.booking.set(r.data);
        this.decisionSaving.set(false);
        this.decisionNote = '';
      },
      error: e => {
        this.error.set(e.error?.message ?? 'Không thể cập nhật đơn thuê');
        this.decisionSaving.set(false);
      }
    });
  }

  isLandlordView(): boolean {
    const booking = this.booking();
    return !!booking && (this.auth.isAdmin() || this.auth.user()?.id === booking.landlordId);
  }

  statusLabel(status: RentalBookingStatus): string {
    const map: Record<RentalBookingStatus, string> = {
      PENDING_PAYMENT: 'Chờ thanh toán cọc',
      DEPOSIT_PAID: 'Đã thanh toán cọc',
      CONFIRMED: 'Đã xác nhận thuê',
      REJECTED: 'Đã bị từ chối',
      CANCELLED: 'Đã huỷ',
      PAYMENT_FAILED: 'Thanh toán lỗi'
    };
    return map[status];
  }
}
