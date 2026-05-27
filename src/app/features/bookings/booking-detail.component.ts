import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { ContractAdjustmentService } from '../../core/services/contract-adjustment.service';
import { RoomService } from '../../core/services/room.service';
import { ToastService } from '../../core/services/toast.service';
import { ContractAdjustment, RentalBooking, RentalBookingStatus } from '../../core/models';

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
  private readonly contractAdjustmentService = inject(ContractAdjustmentService);
  private readonly roomService = inject(RoomService);
  private readonly toast = inject(ToastService);

  booking = signal<RentalBooking | null>(null);
  adjustments = signal<ContractAdjustment[]>([]);
  loading = signal(false);
  decisionNote = '';
  decisionSaving = signal(false);
  paymentOpening = signal(false);
  cashReceiptNote = '';
  renewalMonths = 6;
  renewalTerms = '';
  adjustmentSaving = signal(false);
  adjustmentMonthlyRent: number | null = null;
  adjustmentDepositAmount: number | null = null;
  adjustmentElectricPrice: number | null = null;
  adjustmentWaterPrice: number | null = null;
  adjustmentOtherFees: number | null = null;
  adjustmentProposalNote = '';
  adjustmentResponseNote = '';

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (id) this.load(id);
    });
  }

  load(id: number): void {
    this.loading.set(true);
    this.bookingService.getById(id).subscribe({
      next: r => {
        this.booking.set(r.data);
        this.renewalMonths = 6;
        this.renewalTerms = r.data.contractTerms ?? '';
        this.adjustmentMonthlyRent = r.data.monthlyRent ?? null;
        this.adjustmentDepositAmount = r.data.depositAmount ?? null;
        this.adjustmentElectricPrice = r.data.electricPrice ?? null;
        this.adjustmentWaterPrice = r.data.waterPrice ?? null;
        this.adjustmentOtherFees = r.data.otherFees ?? null;
        this.adjustmentProposalNote = '';
        this.adjustmentResponseNote = '';
        this.loadAdjustments(r.data.id);
        this.loading.set(false);
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không tải được chi tiết đơn thuê');
        this.loading.set(false);
      }
    });
  }

  loadAdjustments(bookingId: number): void {
    this.contractAdjustmentService.getByBooking(bookingId).subscribe({
      next: r => this.adjustments.set(r.data),
      error: () => this.adjustments.set([])
    });
  }

  openPayment(): void {
    const booking = this.booking();
    if (!booking || this.paymentOpening()) return;

    this.paymentOpening.set(true);
    this.bookingService.refreshPaymentLink(booking.id).subscribe({
      next: r => {
        this.booking.set(r.data);
        this.paymentOpening.set(false);
        if (r.data.paymentPayUrl) {
          window.location.href = r.data.paymentPayUrl;
        } else {
          this.toast.error('Không tạo được link thanh toán VNPAY');
        }
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không tạo được link thanh toán VNPAY');
        this.paymentOpening.set(false);
      }
    });
  }

  confirmCashDeposit(): void {
    const booking = this.booking();
    if (!booking) return;
    if (!this.cashReceiptNote.trim()) {
      this.toast.error('Vui lòng nhập ghi chú biên nhận cọc');
      return;
    }

    this.decisionSaving.set(true);
    this.bookingService.confirmCashDeposit(booking.id, this.cashReceiptNote.trim()).subscribe({
      next: r => {
        this.booking.set(r.data);
        this.cashReceiptNote = '';
        this.decisionSaving.set(false);
        this.toast.success('Đã xác nhận nhận cọc');
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không thể xác nhận nhận cọc');
        this.decisionSaving.set(false);
      }
    });
  }

  cancelBooking(): void {
    const booking = this.booking();
    if (!booking) return;

    this.toast.confirm('Xác nhận huỷ đơn thuê phòng này?', () => {
      this.bookingService.cancel(booking.id).subscribe({
        next: r => {
          this.booking.set(r.data);
          this.toast.success('Đã huỷ đơn thuê phòng');
        },
        error: e => this.toast.error(e.error?.message ?? 'Không thể huỷ đơn thuê')
      });
    });
  }

  landlordDecision(action: 'APPROVE' | 'REJECT'): void {
    const booking = this.booking();
    if (!booking) return;

    this.decisionSaving.set(true);
    this.bookingService.landlordDecision(booking.id, {
      action,
      note: this.decisionNote.trim() || undefined
    }).subscribe({
      next: r => {
        this.booking.set(r.data);
        this.decisionSaving.set(false);
        this.decisionNote = '';
        this.toast.success(action === 'APPROVE' ? 'Đã chấp thuận yêu cầu thuê' : 'Đã từ chối yêu cầu thuê');
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không thể cập nhật đơn thuê');
        this.decisionSaving.set(false);
      }
    });
  }

  requestRenewal(): void {
    const booking = this.booking();
    if (!booking) return;
    if (this.renewalMonths < 1) {
      this.toast.error('Thời hạn gia hạn phải từ 1 tháng');
      return;
    }
    this.decisionSaving.set(true);
    this.bookingService.requestRenewal(booking.id, {
      leaseMonths: this.renewalMonths,
      note: this.decisionNote.trim() || undefined
    }).subscribe({
      next: r => {
        this.booking.set(r.data);
        this.decisionSaving.set(false);
        this.toast.success('Đã gửi yêu cầu gia hạn hợp đồng');
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không gửi được yêu cầu gia hạn');
        this.decisionSaving.set(false);
      }
    });
  }

  approveRenewal(): void {
    const booking = this.booking();
    if (!booking) return;
    if (this.renewalMonths < 1) {
      this.toast.error('Thời hạn gia hạn phải từ 1 tháng');
      return;
    }
    this.decisionSaving.set(true);
    this.bookingService.approveRenewal(booking.id, {
      leaseMonths: this.renewalMonths,
      contractTerms: this.renewalTerms.trim() || undefined,
      note: this.decisionNote.trim() || undefined
    }).subscribe({
      next: r => {
        this.booking.set(r.data);
        this.decisionSaving.set(false);
        this.toast.success('Đã chấp thuận gia hạn hợp đồng');
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không thể chấp thuận gia hạn');
        this.decisionSaving.set(false);
      }
    });
  }

  rejectRenewal(): void {
    const booking = this.booking();
    if (!booking) return;
    this.decisionSaving.set(true);
    this.bookingService.rejectRenewal(booking.id, {
      note: this.decisionNote.trim() || undefined
    }).subscribe({
      next: r => {
        this.booking.set(r.data);
        this.decisionSaving.set(false);
        this.toast.success('Đã xác nhận không gia hạn hợp đồng');
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không thể cập nhật trạng thái gia hạn');
        this.decisionSaving.set(false);
      }
    });
  }

  createAdjustment(): void {
    const booking = this.booking();
    if (!booking) return;

    this.adjustmentSaving.set(true);
    this.contractAdjustmentService.create(booking.id, {
      extensionMonths: this.renewalMonths || undefined,
      proposedMonthlyRent: this.adjustmentMonthlyRent ?? undefined,
      proposedDepositAmount: this.adjustmentDepositAmount ?? undefined,
      proposedElectricPrice: this.adjustmentElectricPrice ?? undefined,
      proposedWaterPrice: this.adjustmentWaterPrice ?? undefined,
      proposedOtherFees: this.adjustmentOtherFees ?? undefined,
      proposedContractTerms: this.renewalTerms.trim() || undefined,
      proposalNote: this.adjustmentProposalNote.trim() || undefined
    }).subscribe({
      next: () => {
        this.adjustmentSaving.set(false);
        this.toast.success('Đã gửi đề xuất điều chỉnh hợp đồng');
        this.load(booking.id);
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không gửi được đề xuất điều chỉnh hợp đồng');
        this.adjustmentSaving.set(false);
      }
    });
  }

  respondAdjustment(adjustment: ContractAdjustment, status: 'APPROVED' | 'REJECTED'): void {
    const booking = this.booking();
    if (!booking) return;

    this.adjustmentSaving.set(true);
    this.contractAdjustmentService.updateStatus(adjustment.id, {
      status,
      responseNote: this.adjustmentResponseNote.trim() || undefined
    }).subscribe({
      next: () => {
        this.adjustmentSaving.set(false);
        this.adjustmentResponseNote = '';
        this.toast.success(status === 'APPROVED' ? 'Đã chấp thuận điều chỉnh hợp đồng' : 'Đã từ chối điều chỉnh hợp đồng');
        this.load(booking.id);
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không thể phản hồi đề xuất điều chỉnh');
        this.adjustmentSaving.set(false);
      }
    });
  }

  openForNextViewers(): void {
    const booking = this.booking();
    if (!booking) return;
    this.roomService.updateRoomStatus(booking.roomId, 'AVAILABLE_SOON').subscribe({
      next: () => {
        this.toast.success('Phòng đã mở cho khách mới xem trước');
        this.load(booking.id);
      },
      error: e => this.toast.error(e.error?.message ?? 'Không thể mở phòng cho khách mới')
    });
  }

  waitForRenewal(): void {
    const booking = this.booking();
    if (!booking) return;
    this.roomService.updateRoomStatus(booking.roomId, 'RENTED').subscribe({
      next: () => {
        this.toast.success('Phòng đã chuyển về trạng thái chờ gia hạn');
        this.load(booking.id);
      },
      error: e => this.toast.error(e.error?.message ?? 'Không thể cập nhật trạng thái phòng')
    });
  }

  isLandlordView(): boolean {
    const booking = this.booking();
    return !!booking && (this.auth.isAdmin() || this.auth.user()?.id === booking.landlordId);
  }

  canCreateAdjustment(): boolean {
    const booking = this.booking();
    if (!booking) return false;
    const inStage = booking.status === 'EXPIRING_SOON' || booking.status === 'RENEWAL_PENDING';
    return inStage && !this.pendingAdjustment();
  }

  pendingAdjustment(): ContractAdjustment | null {
    return this.adjustments().find(item => item.status === 'PENDING') ?? null;
  }

  isPendingAdjustmentMine(): boolean {
    const pending = this.pendingAdjustment();
    if (!pending) return false;
    return this.auth.isSeeker() ? pending.proposerRole === 'SEEKER' : pending.proposerRole === 'LANDLORD';
  }

  statusLabel(status: RentalBookingStatus): string {
    const booking = this.booking();
    if (status === 'CANCELLED' && booking?.paymentResultCode === 15) {
      return 'Đã hết hạn thanh toán';
    }

    const map: Record<RentalBookingStatus, string> = {
      REQUESTED: 'Chờ chủ trọ xem xét',
      PENDING_PAYMENT: 'Chờ đặt cọc',
      DEPOSIT_PAID: 'Đã đặt cọc',
      ACTIVE: 'Hợp đồng đang hiệu lực',
      EXPIRING_SOON: 'Sắp hết hạn hợp đồng',
      RENEWAL_PENDING: 'Đang chờ chốt gia hạn',
      REJECTED: 'Đã bị từ chối',
      CANCELLED: 'Đã huỷ',
      PAYMENT_FAILED: 'Thanh toán lỗi',
      COMPLETED: 'Đã kết thúc hợp đồng'
    };
    return map[status];
  }

  paymentLabel(status: RentalBooking['paymentStatus']): string {
    const map: Record<RentalBooking['paymentStatus'], string> = {
      PENDING: 'Chờ thanh toán',
      PAID: 'Đã thanh toán',
      FAILED: 'Thất bại',
      CANCELLED: 'Đã huỷ'
    };
    return map[status];
  }

  paymentMethodLabel(method?: string): string {
    return method === 'CASH' ? 'Tiền mặt / chuyển khoản trực tiếp' : 'VNPAY';
  }
}
