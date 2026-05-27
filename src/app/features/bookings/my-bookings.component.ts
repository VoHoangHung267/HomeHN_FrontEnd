import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { ToastService } from '../../core/services/toast.service';
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
  private readonly toast = inject(ToastService);

  bookings = signal<RentalBooking[]>([]);
  loading = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const request$ = this.auth.isLandlord() || this.auth.isAdmin()
      ? this.bookingService.getLandlordBookings()
      : this.bookingService.getMyBookings();

    request$.subscribe({
      next: r => {
        this.bookings.set(r.data);
        this.loading.set(false);
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không tải được danh sách đơn thuê');
        this.loading.set(false);
      }
    });
  }

  statusLabel(booking: RentalBooking): string {
    if (booking.status === 'COMPLETED' && this.isEarlyTerminated(booking)) {
      return 'Đã kết thúc sớm';
    }

    const map: Record<RentalBookingStatus, string> = {
      REQUESTED: 'Chờ chủ trọ xác nhận',
      PENDING_PAYMENT: 'Chờ thanh toán cọc',
      DEPOSIT_PAID: 'Đã đặt cọc',
      ACTIVE: 'Hợp đồng đang hiệu lực',
      EXPIRING_SOON: 'Sắp hết hạn hợp đồng',
      RENEWAL_PENDING: 'Đang chờ chốt gia hạn',
      EARLY_TERMINATION_PENDING: 'Chờ admin duyệt kết thúc sớm',
      REJECTED: 'Đã bị từ chối',
      CANCELLED: 'Đã huỷ',
      PAYMENT_FAILED: 'Thanh toán lỗi',
      COMPLETED: 'Đã hoàn tất thuê'
    };
    return map[booking.status];
  }

  private isEarlyTerminated(booking: RentalBooking): boolean {
    const message = booking.paymentMessage?.toLowerCase() ?? '';
    const note = booking.landlordNote?.toLowerCase() ?? '';
    return message.includes('kết thúc hợp đồng sớm') || note.includes('kết thúc hợp đồng trước hạn');
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
