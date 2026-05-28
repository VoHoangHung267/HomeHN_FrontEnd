import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BookingService } from '../../../core/services/booking.service';
import { RoomService } from '../../../core/services/room.service';
import { ViewingAppointmentService } from '../../../core/services/viewing-appointment.service';
import { ToastService } from '../../../core/services/toast.service';
import { Room, RoomStatus, STATUS_LABELS, ViewingAppointment, ViewingAppointmentStatus } from '../../../core/models';

@Component({
  selector: 'app-landlord-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './landlord-dashboard.component.html',
  styleUrls: ['./landlord-dashboard.component.scss']
})
export class LandlordDashboardComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly bookingService = inject(BookingService);
  private readonly roomService = inject(RoomService);
  private readonly appointmentService = inject(ViewingAppointmentService);
  private readonly toast = inject(ToastService);

  rooms = signal<Room[]>([]);
  appointments = signal<ViewingAppointment[]>([]);
  loading = signal(false);
  loadingAppointments = signal(false);

  showRescheduleModal = signal(false);
  rescheduleTarget = signal<ViewingAppointment | null>(null);
  rescheduleAt = signal('');
  rescheduleMin = signal('');
  rescheduleNote = signal('');
  rescheduleSaving = signal(false);
  rescheduleError = signal('');

  showReasonModal = signal(false);
  reasonModalTitle = signal('');
  reasonModalPlaceholder = signal('');
  reasonModalValue = signal('');
  reasonModalError = signal('');
  reasonModalSaving = signal(false);
  private reasonModalHandler: ((value: string) => void) | null = null;

  total = computed(() => this.rooms().length);
  activeCount = computed(() => this.rooms().filter(room => room.status === 'ACTIVE').length);
  pendingCount = computed(() => this.rooms().filter(room => room.status === 'PENDING').length);
  totalViews = computed(() => this.rooms().reduce((sum, room) => sum + room.viewCount, 0));

  ngOnInit(): void {
    this.loading.set(true);
    this.roomService.getMyRooms().subscribe({
      next: response => {
        this.rooms.set(response.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
    this.loadAppointments();
  }

  statusLabel(status: RoomStatus): string {
    return STATUS_LABELS[status] ?? status;
  }

  deleteRoom(room: Room): void {
    this.toast.confirm(`Xác nhận xoá phòng "${room.title}"?`, () => {
      this.roomService.deleteRoom(room.id).subscribe(() => {
        this.rooms.update(list => list.filter(item => item.id !== room.id));
      });
    });
  }

  hideRoom(room: Room): void {
    this.toast.confirm(`Ẩn tin phòng "${room.title}"?`, () => {
      this.updateRoomStatus(room, 'HIDDEN');
    });
  }

  reactivateRoom(room: Room): void {
    this.toast.confirm(`Hiện lại phòng "${room.title}"?`, () => {
      this.updateRoomStatus(room, 'ACTIVE');
    });
  }

  terminateContractEarly(room: Room): void {
    this.openReasonModal(
      'Lý do kết thúc hợp đồng sớm',
      `Nhập lý do kết thúc hợp đồng sớm cho phòng "${room.title}"`,
      reason => {
        this.toast.confirm(`Gửi yêu cầu kết thúc hợp đồng sớm cho phòng "${room.title}"?`, () => {
          this.bookingService.terminateContractEarly(room.id, { note: reason }).subscribe({
            next: () => {
              this.toast.success('Đã gửi yêu cầu kết thúc hợp đồng sớm. Chờ admin duyệt.');
              this.closeReasonModal(true);
            },
            error: error => {
              this.reasonModalSaving.set(false);
              this.toast.error(error.error?.message ?? 'Không thể gửi yêu cầu kết thúc hợp đồng sớm');
            }
          });
        }, 'Gửi yêu cầu', 'Huỷ');
      }
    );
  }

  markRented(room: Room): void {
    this.toast.confirm(`Đánh dấu phòng "${room.title}" đã cho thuê?`, () => {
      this.updateRoomStatus(room, 'RENTED');
    });
  }

  markAvailable(room: Room): void {
    this.toast.confirm(`Đánh dấu phòng "${room.title}" còn trống?`, () => {
      this.updateRoomStatus(room, 'ACTIVE');
    });
  }

  loadAppointments(): void {
    this.loadingAppointments.set(true);
    this.appointmentService.getMyAppointments().subscribe({
      next: response => {
        this.appointments.set(response.data);
        this.loadingAppointments.set(false);
      },
      error: () => this.loadingAppointments.set(false)
    });
  }

  updateAppointment(
    appointment: ViewingAppointment,
    status: ViewingAppointmentStatus,
    requestedAt?: string,
    note?: string
  ): void {
    this.appointmentService.updateStatus(appointment.id, { status, requestedAt, note }).subscribe(response => {
      this.appointments.update(list => list.map(item => item.id === appointment.id ? response.data : item));
      if (status === 'COMPLETED') {
        this.rooms.update(list => list.map(room =>
          room.id === appointment.roomId ? { ...room, status: 'RENTED' as RoomStatus } : room
        ));
      }
    });
  }

  rejectAppointment(appointment: ViewingAppointment): void {
    this.openReasonModal(
      'Lý do từ chối lịch xem',
      'Nhập lý do để người thuê biết vì sao lịch xem bị từ chối',
      reason => {
        this.updateAppointment(appointment, 'REJECTED', undefined, reason);
        this.closeReasonModal(true);
      }
    );
  }

  rescheduleAppointment(appointment: ViewingAppointment): void {
    this.rescheduleTarget.set(appointment);
    this.rescheduleMin.set(this.toDateTimeLocalValue(new Date()));
    this.rescheduleAt.set(this.toDateTimeLocalValue(new Date(appointment.requestedAt)));
    this.rescheduleNote.set(appointment.landlordNote ?? '');
    this.rescheduleError.set('');
    this.showRescheduleModal.set(true);
  }

  closeRescheduleModal(): void {
    if (this.rescheduleSaving()) return;
    this.showRescheduleModal.set(false);
    this.rescheduleTarget.set(null);
    this.rescheduleAt.set('');
    this.rescheduleNote.set('');
    this.rescheduleError.set('');
  }

  closeReasonModal(force = false): void {
    if (!force && this.reasonModalSaving()) return;
    this.showReasonModal.set(false);
    this.reasonModalTitle.set('');
    this.reasonModalPlaceholder.set('');
    this.reasonModalValue.set('');
    this.reasonModalError.set('');
    this.reasonModalSaving.set(false);
    this.reasonModalHandler = null;
  }

  submitReasonModal(): void {
    const reason = this.reasonModalValue().trim();
    if (!reason) {
      this.reasonModalError.set('Vui lòng nhập nội dung');
      return;
    }
    if (!this.reasonModalHandler) return;

    this.reasonModalError.set('');
    this.reasonModalSaving.set(true);
    this.reasonModalHandler(reason);
  }

  submitReschedule(): void {
    const appointment = this.rescheduleTarget();
    if (!appointment) return;

    const requestedAt = this.normalizeDateTimeLocal(this.rescheduleAt());
    if (!requestedAt) {
      this.rescheduleError.set('Vui lòng chọn thời gian đề xuất mới');
      return;
    }
    if (!this.isFutureDateTime(requestedAt)) {
      this.rescheduleError.set('Vui lòng chọn thời gian trong tương lai');
      return;
    }

    this.rescheduleSaving.set(true);
    this.appointmentService.updateStatus(appointment.id, {
      status: 'RESCHEDULED',
      requestedAt,
      note: this.rescheduleNote().trim()
    }).subscribe({
      next: response => {
        this.appointments.update(list => list.map(item => item.id === appointment.id ? response.data : item));
        this.rescheduleSaving.set(false);
        this.closeRescheduleModal();
      },
      error: error => {
        this.rescheduleError.set(error.error?.data?.requestedAt ?? error.error?.message ?? 'Không thể đổi giờ hẹn');
        this.rescheduleSaving.set(false);
      }
    });
  }

  appointmentStatusLabel(status: ViewingAppointmentStatus): string {
    const labels: Record<ViewingAppointmentStatus, string> = {
      PENDING: 'Chờ phản hồi',
      ACCEPTED: 'Đã chấp nhận',
      RESCHEDULED: 'Đề xuất giờ khác',
      REJECTED: 'Đã từ chối',
      CANCELLED: 'Người thuê đã huỷ',
      COMPLETED: 'Đã hoàn tất'
    };
    return labels[status];
  }

  canHide(room: Room): boolean {
    return room.status === 'ACTIVE';
  }

  canReactivate(room: Room): boolean {
    return room.status === 'HIDDEN' || room.status === 'HIDDEN_REVIEW' || room.status === 'AVAILABLE_SOON';
  }

  canTerminateEarly(room: Room): boolean {
    return room.status === 'RENTED';
  }

  canMarkRented(room: Room): boolean {
    return room.status === 'ACTIVE' || room.status === 'HIDDEN';
  }

  private updateRoomStatus(room: Room, status: RoomStatus): void {
    this.roomService.updateRoomStatus(room.id, status).subscribe({
      next: response => {
        this.rooms.update(list => list.map(item => item.id === room.id ? response.data : item));
        this.toast.success('Đã cập nhật trạng thái phòng');
      },
      error: error => {
        this.toast.error(error.error?.message ?? 'Không thể cập nhật trạng thái phòng');
      }
    });
  }

  private openReasonModal(title: string, placeholder: string, handler: (value: string) => void): void {
    this.reasonModalTitle.set(title);
    this.reasonModalPlaceholder.set(placeholder);
    this.reasonModalValue.set('');
    this.reasonModalError.set('');
    this.reasonModalSaving.set(false);
    this.reasonModalHandler = handler;
    this.showReasonModal.set(true);
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
    const pad = (value: number) => value.toString().padStart(2, '0');
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
