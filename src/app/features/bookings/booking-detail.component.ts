import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { ContractAdjustmentService } from '../../core/services/contract-adjustment.service';
import { ContractTemplateService } from '../../core/services/contract-template.service';
import { RoomService } from '../../core/services/room.service';
import { ToastService } from '../../core/services/toast.service';
import {
  ContractAdjustment,
  ContractTemplate,
  RentalBooking,
  RentalBookingStatus
} from '../../core/models';

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
  private readonly contractTemplateService = inject(ContractTemplateService);
  private readonly roomService = inject(RoomService);
  private readonly toast = inject(ToastService);

  booking = signal<RentalBooking | null>(null);
  adjustments = signal<ContractAdjustment[]>([]);
  contractTemplates = signal<ContractTemplate[]>([]);
  loading = signal(false);
  decisionSaving = signal(false);
  paymentOpening = signal(false);
  adjustmentSaving = signal(false);
  templateSaving = signal(false);

  decisionNote = '';
  cashReceiptNote = '';
  renewalMonths = 6;
  renewalTerms = '';
  adjustmentResponseNote = '';

  templateName = '';
  selectedTemplateId: number | null = null;
  draftMonthlyRent: number | null = null;
  draftDepositAmount: number | null = null;
  draftElectricPrice: number | null = null;
  draftWaterPrice: number | null = null;
  draftOtherFees: number | null = null;
  draftMoveInRules = '';
  draftServiceNotes = '';
  draftAdditionalTerms = '';

  requestedMonthlyRent: number | null = null;
  requestedDepositAmount: number | null = null;
  requestedElectricPrice: number | null = null;
  requestedWaterPrice: number | null = null;
  requestedOtherFees: number | null = null;
  requestedMoveInRules = '';
  requestedServiceNotes = '';
  requestedAdditionalTerms = '';
  adjustmentProposalNote = '';

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
        this.setDraftFromBooking(r.data);
        this.resetAdjustmentRequestForm(r.data);
        this.adjustmentResponseNote = '';
        this.loadAdjustments(r.data.id);
        if (this.isLandlordView()) {
          this.loadContractTemplates();
        } else {
          this.contractTemplates.set([]);
        }
        this.loading.set(false);
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không tải được chi tiết đơn thuê');
        this.loading.set(false);
      }
    });
  }

  private setDraftFromBooking(booking: RentalBooking): void {
    this.draftMonthlyRent = booking.monthlyRent ?? null;
    this.draftDepositAmount = booking.depositAmount ?? null;
    this.draftElectricPrice = booking.electricPrice ?? null;
    this.draftWaterPrice = booking.waterPrice ?? null;
    this.draftOtherFees = booking.otherFees ?? null;
    this.draftMoveInRules = booking.contractMoveInRules ?? '';
    this.draftServiceNotes = booking.contractServiceNotes ?? '';
    this.draftAdditionalTerms = booking.contractAdditionalTerms ?? '';
  }

  private resetAdjustmentRequestForm(booking: RentalBooking): void {
    this.requestedMonthlyRent = booking.monthlyRent ?? null;
    this.requestedDepositAmount = booking.depositAmount ?? null;
    this.requestedElectricPrice = booking.electricPrice ?? null;
    this.requestedWaterPrice = booking.waterPrice ?? null;
    this.requestedOtherFees = booking.otherFees ?? null;
    this.requestedMoveInRules = booking.contractMoveInRules ?? '';
    this.requestedServiceNotes = booking.contractServiceNotes ?? '';
    this.requestedAdditionalTerms = booking.contractAdditionalTerms ?? '';
    this.adjustmentProposalNote = '';
  }

  loadAdjustments(bookingId: number): void {
    this.contractAdjustmentService.getByBooking(bookingId).subscribe({
      next: r => this.adjustments.set(r.data),
      error: () => this.adjustments.set([])
    });
  }

  loadContractTemplates(): void {
    this.contractTemplateService.getMine().subscribe({
      next: r => this.contractTemplates.set(r.data),
      error: () => this.contractTemplates.set([])
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
        this.toast.success(action === 'APPROVE' ? 'Đã chuyển sang bước đặt cọc' : 'Đã từ chối yêu cầu thuê');
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

  updateContractDraft(): void {
    const booking = this.booking();
    if (!booking) return;
    if (!this.draftMoveInRules.trim() || !this.draftServiceNotes.trim()) {
      this.toast.error('Vui lòng nhập đủ giờ giấc và thông tin dịch vụ');
      return;
    }

    this.adjustmentSaving.set(true);
    this.bookingService.updateContractDraft(booking.id, {
      monthlyRent: this.draftMonthlyRent ?? undefined,
      depositAmount: this.draftDepositAmount ?? undefined,
      electricPrice: this.draftElectricPrice ?? undefined,
      waterPrice: this.draftWaterPrice ?? undefined,
      otherFees: this.draftOtherFees ?? undefined,
      moveInRules: this.draftMoveInRules.trim(),
      serviceNotes: this.draftServiceNotes.trim(),
      additionalTerms: this.draftAdditionalTerms.trim() || undefined
    }).subscribe({
      next: r => {
        this.booking.set(r.data);
        this.setDraftFromBooking(r.data);
        this.resetAdjustmentRequestForm(r.data);
        this.adjustmentSaving.set(false);
        this.toast.success('Đã cập nhật điều khoản dự kiến để người thuê xem');
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không cập nhật được hợp đồng');
        this.adjustmentSaving.set(false);
      }
    });
  }

  createAdjustment(): void {
    const booking = this.booking();
    if (!booking) return;

    this.adjustmentSaving.set(true);
    this.contractAdjustmentService.create(booking.id, {
      proposedMonthlyRent: this.requestedMonthlyRent ?? undefined,
      proposedDepositAmount: this.requestedDepositAmount ?? undefined,
      proposedElectricPrice: this.requestedElectricPrice ?? undefined,
      proposedWaterPrice: this.requestedWaterPrice ?? undefined,
      proposedOtherFees: this.requestedOtherFees ?? undefined,
      proposedMoveInRules: this.requestedMoveInRules.trim() || undefined,
      proposedServiceNotes: this.requestedServiceNotes.trim() || undefined,
      proposedAdditionalTerms: this.requestedAdditionalTerms.trim() || undefined,
      proposalNote: this.adjustmentProposalNote.trim() || undefined
    }).subscribe({
      next: () => {
        this.adjustmentSaving.set(false);
        this.toast.success('Đã gửi yêu cầu chỉnh sửa điều khoản');
        this.load(booking.id);
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không gửi được yêu cầu chỉnh sửa điều khoản');
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
        this.toast.success(status === 'APPROVED' ? 'Đã duyệt yêu cầu chỉnh sửa' : 'Đã từ chối yêu cầu chỉnh sửa');
        this.load(booking.id);
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không thể phản hồi yêu cầu chỉnh sửa');
        this.adjustmentSaving.set(false);
      }
    });
  }

  saveTemplate(overwrite = false): void {
    if (!this.templateName.trim()) {
      this.toast.error('Vui lòng nhập tên mẫu hợp đồng');
      return;
    }
    if (!this.draftMoveInRules.trim() || !this.draftServiceNotes.trim()) {
      this.toast.error('Vui lòng nhập đủ giờ giấc và thông tin dịch vụ');
      return;
    }

    const payload = {
      name: this.templateName.trim(),
      defaultMonthlyRent: this.draftMonthlyRent ?? undefined,
      defaultDepositAmount: this.draftDepositAmount ?? undefined,
      defaultElectricPrice: this.draftElectricPrice ?? undefined,
      defaultWaterPrice: this.draftWaterPrice ?? undefined,
      defaultOtherFees: this.draftOtherFees ?? undefined,
      moveInRules: this.draftMoveInRules.trim(),
      serviceNotes: this.draftServiceNotes.trim(),
      additionalTerms: this.draftAdditionalTerms.trim() || undefined
    };

    this.templateSaving.set(true);
    const request = overwrite && this.selectedTemplateId
      ? this.contractTemplateService.update(this.selectedTemplateId, payload)
      : this.contractTemplateService.create(payload);

    request.subscribe({
      next: r => {
        const updatedExisting = overwrite && !!this.selectedTemplateId;
        this.templateSaving.set(false);
        this.selectedTemplateId = r.data.id;
        this.applyTemplate(r.data.id);
        this.loadContractTemplates();
        this.toast.success(updatedExisting ? 'Đã cập nhật mẫu hợp đồng' : 'Đã lưu mẫu hợp đồng');
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không lưu được mẫu hợp đồng');
        this.templateSaving.set(false);
      }
    });
  }

  applyTemplate(templateId: number | null): void {
    if (!templateId) {
      this.selectedTemplateId = null;
      return;
    }

    const template = this.contractTemplates().find(item => item.id === templateId);
    if (!template) return;

    this.selectedTemplateId = template.id;
    this.templateName = template.name;
    this.draftMonthlyRent = template.defaultMonthlyRent ?? null;
    this.draftDepositAmount = template.defaultDepositAmount ?? null;
    this.draftElectricPrice = template.defaultElectricPrice ?? null;
    this.draftWaterPrice = template.defaultWaterPrice ?? null;
    this.draftOtherFees = template.defaultOtherFees ?? null;
    this.draftMoveInRules = template.moveInRules ?? '';
    this.draftServiceNotes = template.serviceNotes ?? '';
    this.draftAdditionalTerms = template.additionalTerms ?? '';
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

  canManageContractTemplates(): boolean {
    const booking = this.booking();
    return !!booking && this.isLandlordView() && booking.status === 'REQUESTED';
  }

  canEditContractDraft(): boolean {
    const booking = this.booking();
    return !!booking && this.isLandlordView() && booking.status === 'REQUESTED';
  }

  canTenantRequestAdjustment(): boolean {
    const booking = this.booking();
    return !!booking && !this.isLandlordView() && booking.status === 'REQUESTED' && !this.pendingAdjustment();
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
      REQUESTED: 'Đang xem và chốt hợp đồng',
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
