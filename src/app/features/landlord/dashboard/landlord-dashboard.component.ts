import { Component, ChangeDetectionStrategy, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { BookingService } from '../../../core/services/booking.service';
import { RoomService } from '../../../core/services/room.service';
import { ViewingAppointmentService } from '../../../core/services/viewing-appointment.service';
import { ToastService } from '../../../core/services/toast.service';
import { Room, STATUS_LABELS, RoomStatus, ViewingAppointment, ViewingAppointmentStatus } from '../../../core/models';

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

  total = computed(() => this.rooms().length);
  activeCount = computed(() => this.rooms().filter(r => r.status === 'ACTIVE').length);
  pendingCount = computed(() => this.rooms().filter(r => r.status === 'PENDING').length);
  totalViews = computed(() => this.rooms().reduce((s, r) => s + r.viewCount, 0));

  ngOnInit(): void {
    this.loading.set(true);
    this.roomService.getMyRooms().subscribe({
      next: r => { this.rooms.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
    this.loadAppointments();
  }

  statusLabel(s: RoomStatus): string {
    return STATUS_LABELS[s] ?? s;
  }

  deleteRoom(room: Room): void {
    this.toast.confirm(`Xác nhận xoá phòng "${room.title}"?`, () => {
      this.roomService.deleteRoom(room.id).subscribe(() => {
        this.rooms.update(list => list.filter(r => r.id !== room.id));
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
    const reason = prompt(`Lý do yêu cầu kết thúc hợp đồng sớm cho phòng "${room.title}"?`)?.trim() ?? '';
    if (!reason) {
      this.toast.error('Vui lòng nhập lý do kết thúc hợp đồng sớm');
      return;
    }

    this.toast.confirm(`Gửi yêu cầu kết thúc hợp đồng sớm cho phòng "${room.title}"?`, () => {
      this.bookingService.terminateContractEarly(room.id, { note: reason }).subscribe({
        next: () => {
          this.toast.success('Đã gửi yêu cầu kết thúc hợp đồng sớm. Chờ admin duyệt.');
        },
        error: e => {
          this.toast.error(e.error?.message ?? 'Không thể gửi yêu cầu kết thúc hợp đồng sớm');
        }
      });
    });
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
      next: r => { this.appointments.set(r.data); this.loadingAppointments.set(false); },
      error: () => this.loadingAppointments.set(false)
    });
  }

  updateAppointment(
    appointment: ViewingAppointment,
    status: ViewingAppointmentStatus,
    requestedAt?: string,
    note?: string
  ): void {
    this.appointmentService.updateStatus(appointment.id, { status, requestedAt, note }).subscribe(r => {
      this.appointments.update(list => list.map(x => x.id === appointment.id ? r.data : x));
      if (status === 'COMPLETED') {
        this.rooms.update(list => list.map(room =>
          room.id === appointment.roomId ? { ...room, status: 'RENTED' as RoomStatus } : room
        ));
      }
    });
  }

  rejectAppointment(appointment: ViewingAppointment): void {
    const note = prompt('Lý do từ chối lịch xem phòng?') ?? '';
    this.updateAppointment(appointment, 'REJECTED', undefined, note);
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
      next: r => {
        this.appointments.update(list => list.map(x => x.id === appointment.id ? r.data : x));
        this.rescheduleSaving.set(false);
        this.closeRescheduleModal();
      },
      error: e => {
        this.rescheduleError.set(e.error?.data?.requestedAt ?? e.error?.message ?? 'Không thể đổi giờ hẹn');
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
      next: r => {
        this.rooms.update(list => list.map(item => item.id === room.id ? r.data : item));
        this.toast.success('Đã cập nhật trạng thái phòng');
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không thể cập nhật trạng thái phòng');
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
}
