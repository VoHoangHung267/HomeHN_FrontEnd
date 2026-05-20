import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ViewingAppointmentService } from '../../core/services/viewing-appointment.service';
import { ViewingAppointment, ViewingAppointmentStatus } from '../../core/models';

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe],
  templateUrl: './my-appointments.component.html',
  styleUrls: ['./my-appointments.component.scss']
})
export class MyAppointmentsComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly appointmentService = inject(ViewingAppointmentService);
  private readonly toast = inject(ToastService);

  appointments = signal<ViewingAppointment[]>([]);
  loading = signal(false);
  error = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.appointmentService.getMyAppointments().subscribe({
      next: r => {
        this.appointments.set(r.data);
        this.loading.set(false);
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không tải được danh sách lịch xem phòng');
        this.loading.set(false);
      }
    });
  }

  cancelAppointment(appointment: ViewingAppointment): void {
    if (!this.canCancel(appointment) || !confirm('Huỷ lịch xem phòng này?')) return;

    this.appointmentService.cancel(appointment.id).subscribe({
      next: r => {
        this.appointments.update(list => list.map(item => item.id === appointment.id ? r.data : item));
        this.toast.success('Đã huỷ lịch xem phòng');
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không huỷ được lịch xem phòng');
      }
    });
  }

  canCancel(appointment: ViewingAppointment): boolean {
    return this.auth.isSeeker() && ['PENDING', 'ACCEPTED', 'RESCHEDULED'].includes(appointment.status);
  }

  statusLabel(status: ViewingAppointmentStatus): string {
    const map: Record<ViewingAppointmentStatus, string> = {
      PENDING: 'Chờ phản hồi',
      ACCEPTED: 'Đã chấp nhận',
      RESCHEDULED: 'Chủ nhà đề xuất giờ khác',
      REJECTED: 'Đã từ chối',
      CANCELLED: 'Đã huỷ',
      COMPLETED: 'Đã hoàn tất'
    };
    return map[status];
  }
}
