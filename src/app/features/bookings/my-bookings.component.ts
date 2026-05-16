import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { RentalBooking, RentalBookingStatus, RentalPaymentStatus } from '../../core/models';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './my-bookings.component.html',
  styleUrls: ['./my-bookings.component.scss']
})
export class MyBookingsComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly bookingService = inject(BookingService);

  bookings = signal<RentalBooking[]>([]);
  loading = signal(false);
  error = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    const request$ = this.auth.isLandlord() || this.auth.isAdmin()
      ? this.bookingService.getLandlordBookings()
      : this.bookingService.getMyBookings();

    request$.subscribe({
      next: r => {
        this.bookings.set(r.data);
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e.error?.message ?? 'Không tải được danh sách đơn thuê');
        this.loading.set(false);
      }
    });
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

  paymentLabel(status: RentalPaymentStatus): string {
    const map: Record<RentalPaymentStatus, string> = {
      PENDING: 'Chờ thanh toán',
      PAID: 'Đã thanh toán',
      FAILED: 'Thất bại',
      CANCELLED: 'Đã huỷ'
    };
    return map[status];
  }
}
