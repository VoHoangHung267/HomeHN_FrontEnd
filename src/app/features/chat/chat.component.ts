import {
  Component, ChangeDetectionStrategy, OnInit, OnDestroy, AfterViewChecked,
  signal, computed, inject, ViewChild, ElementRef
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { ViewingAppointmentService } from '../../core/services/viewing-appointment.service';
import { ToastService } from '../../core/services/toast.service';
import {
  ChatRoom, Message, RentalBooking, RentalBookingStatus, RentalPaymentStatus,
  ViewingAppointment, ViewingAppointmentStatus
} from '../../core/models';

@Component({
  selector: 'app-chat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DatePipe, DecimalPipe],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesWrap') private messagesEl!: ElementRef<HTMLElement>;

  readonly auth = inject(AuthService);
  readonly chatService = inject(ChatService);
  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private readonly phoneRegex = /^0\d{9}$/;
  private readonly identityRegex = /^(?:\d{9}|\d{12})$/;
  private readonly bookingService = inject(BookingService);
  private readonly appointmentService = inject(ViewingAppointmentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  chatRooms = signal<ChatRoom[]>([]);
  messages = signal<Message[]>([]);
  activeChatId = signal<number | null>(null);
  activeChat = signal<ChatRoom | null>(null);
  inputText = signal('');
  activeActionTab = signal<'appointment' | 'booking'>('appointment');
  private shouldScrollBottom = false;

  allAppointments = signal<ViewingAppointment[]>([]);
  allBookings = signal<RentalBooking[]>([]);
  actionLoading = signal(false);

  appointmentAt = '';
  appointmentMessage = '';
  appointmentSending = signal(false);

  bookingFullName = '';
  bookingPhone = '';
  bookingEmail = '';
  bookingIdentityNumber = '';
  bookingMoveInDate = '';
  bookingLeaseMonths = 6;
  bookingOccupantCount = 1;
  bookingNote = '';
  bookingSending = signal(false);
  paymentOpeningId = signal<number | null>(null);

  currentUserId = computed(() => this.auth.user()!.id);

  relatedAppointments = computed(() => {
    const roomId = this.activeChat()?.roomId;
    if (!roomId) return [];
    return this.allAppointments().filter(item => item.roomId === roomId);
  });

  relatedBookings = computed(() => {
    const roomId = this.activeChat()?.roomId;
    if (!roomId) return [];
    return this.allBookings().filter(item => item.roomId === roomId);
  });

  ngOnInit(): void {
    this.chatService.connect();
    this.chatService.resetUnread();
    this.loadChatRooms();
    this.loadRelatedData();

    this.route.queryParams.subscribe(params => {
      const chatId = Number(params['chatId']);
      if (chatId) {
        const found = this.chatRooms().find(cr => cr.id === chatId);
        if (found) {
          this.openChatRoom(found);
        } else {
          this.chatService.getMyChats().subscribe(r => {
            const cr = r.data.find(c => c.id === chatId);
            if (cr) {
              this.chatRooms.set(r.data);
              this.openChatRoom(cr);
            }
          });
        }
      }
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollBottom) {
      this.scrollBottom();
      this.shouldScrollBottom = false;
    }
  }

  ngOnDestroy(): void {
    if (this.activeChatId()) {
      this.chatService.offMessage(this.activeChatId()!);
    }
  }

  loadChatRooms(): void {
    this.chatService.getMyChats().subscribe(r => this.chatRooms.set(r.data));
  }

  loadRelatedData(): void {
    this.actionLoading.set(true);

    this.appointmentService.getMyAppointments().subscribe({
      next: r => {
        this.allAppointments.set(r.data);
        this.actionLoading.set(false);
      },
      error: () => this.actionLoading.set(false)
    });

    const request$ = this.auth.isLandlord() || this.auth.isAdmin()
      ? this.bookingService.getLandlordBookings()
      : this.bookingService.getMyBookings();

    request$.subscribe({
      next: r => this.allBookings.set(r.data),
      error: () => {}
    });
  }

  openChatRoom(cr: ChatRoom): void {
    if (this.activeChatId()) this.chatService.offMessage(this.activeChatId()!);

    this.activeChatId.set(cr.id);
    this.activeChat.set(cr);
    this.activeActionTab.set('appointment');
    this.resetActionForms();

    this.chatRooms.update(list =>
      list.map(c => c.id === cr.id ? { ...c, unreadCount: 0 } : c)
    );

    this.chatService.getMessages(cr.id).subscribe(r => {
      this.messages.set(r.data);
      this.shouldScrollBottom = true;
    });

    this.chatService.onMessage(cr.id, (msg: Message) => {
      this.messages.update(list => [...list, msg]);
      this.shouldScrollBottom = true;
      this.chatRooms.update(list =>
        list.map(c => c.id === cr.id
          ? { ...c, lastMessage: msg.content, lastMessageAt: msg.sentAt }
          : c)
      );
    });
  }

  sendMessage(): void {
    const content = this.inputText().trim();
    if (!content || !this.activeChatId()) return;

    const temp: Message = {
      id: Date.now(),
      chatRoomId: this.activeChatId()!,
      senderId: this.currentUserId(),
      senderName: this.auth.user()!.fullName,
      senderAvatar: this.auth.user()!.avatarUrl,
      content,
      isRead: false,
      sentAt: new Date().toISOString()
    };

    this.messages.update(list => [...list, temp]);
    this.shouldScrollBottom = true;

    this.chatService.send(this.activeChatId()!, content);
    this.inputText.set('');

    this.chatRooms.update(list =>
      list.map(c => c.id === this.activeChatId()
        ? { ...c, lastMessage: content, lastMessageAt: new Date().toISOString() }
        : c)
    );
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  submitAppointment(): void {
    const chat = this.activeChat();
    if (!chat) return;

    const requestedAt = this.normalizeDateTimeLocal(this.appointmentAt);
    if (!requestedAt) {
      this.toast.error('Vui lòng chọn thời gian xem phòng');
      return;
    }
    if (!this.isFutureDateTime(requestedAt)) {
      this.toast.error('Vui lòng chọn thời gian trong tương lai');
      return;
    }

    this.appointmentSending.set(true);

    this.appointmentService.create(chat.roomId, {
      requestedAt,
      message: this.appointmentMessage.trim() || undefined
    }).subscribe({
      next: r => {
        this.allAppointments.update(list => [r.data, ...list]);
        this.toast.success('Đã gửi yêu cầu hẹn lịch xem phòng');
        this.appointmentMessage = '';
        this.appointmentAt = '';
        this.appointmentSending.set(false);
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không gửi được yêu cầu hẹn lịch');
        this.appointmentSending.set(false);
      }
    });
  }

  cancelAppointment(appointment: ViewingAppointment): void {
    if (!this.canCancelAppointment(appointment) || !confirm('Huỷ lịch xem phòng này?')) return;

    this.appointmentService.cancel(appointment.id).subscribe({
      next: r => {
        this.allAppointments.update(list => list.map(item => item.id === appointment.id ? r.data : item));
        this.toast.success('Đã huỷ lịch xem phòng');
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không huỷ được lịch xem phòng');
      }
    });
  }

  submitBooking(): void {
    const chat = this.activeChat();
    if (!chat) return;

    if (!this.bookingFullName.trim() || !this.bookingPhone.trim()) {
      this.toast.error('Vui lòng nhập họ tên và số điện thoại');
      return;
    }
    if (!this.bookingMoveInDate) {
      this.toast.error('Vui lòng chọn ngày dự kiến vào ở');
      return;
    }

    if (!this.phoneRegex.test(this.bookingPhone.trim())) {
      this.toast.error('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0');
      return;
    }
    if (this.bookingEmail.trim() && !this.emailRegex.test(this.bookingEmail.trim())) {
      this.toast.error('Email không hợp lệ');
      return;
    }
    if (this.bookingIdentityNumber.trim() && !this.identityRegex.test(this.bookingIdentityNumber.trim())) {
      this.toast.error('CCCD/CMND phải gồm 9 hoặc 12 chữ số');
      return;
    }
    if (this.bookingLeaseMonths < 1 || this.bookingLeaseMonths > 36) {
      this.toast.error('Thời hạn thuê phải từ 1 đến 36 tháng');
      return;
    }
    if (this.bookingOccupantCount < 1 || this.bookingOccupantCount > 20) {
      this.toast.error('Số người ở phải từ 1 đến 20');
      return;
    }

    this.bookingSending.set(true);

    this.bookingService.create(chat.roomId, {
      tenantFullName: this.bookingFullName.trim(),
      tenantPhone: this.bookingPhone.trim(),
      tenantEmail: this.bookingEmail.trim() || undefined,
      tenantIdentityNumber: this.bookingIdentityNumber.trim() || undefined,
      moveInDate: this.bookingMoveInDate,
      leaseMonths: this.bookingLeaseMonths,
      occupantCount: this.bookingOccupantCount,
      note: this.bookingNote.trim() || undefined
    }).subscribe({
      next: r => {
        this.allBookings.update(list => [r.data, ...list]);
        this.toast.success('Đã tạo yêu cầu thuê phòng');
        this.bookingNote = '';
        this.bookingSending.set(false);
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không tạo được yêu cầu thuê phòng');
        this.bookingSending.set(false);
      }
    });
  }

  canCancelAppointment(appointment: ViewingAppointment): boolean {
    return this.auth.isSeeker() && ['PENDING', 'ACCEPTED', 'RESCHEDULED'].includes(appointment.status);
  }

  canCreateActions(): boolean {
    return this.auth.isSeeker();
  }

  canPayBooking(booking: RentalBooking): boolean {
    return this.auth.isSeeker() && ['PENDING_PAYMENT', 'PAYMENT_FAILED'].includes(booking.status);
  }

  openPayment(booking: RentalBooking): void {
    if (this.paymentOpeningId() === booking.id) return;

    this.paymentOpeningId.set(booking.id);
    this.bookingService.refreshPaymentLink(booking.id).subscribe({
      next: r => {
        this.allBookings.update(list => list.map(item => item.id === booking.id ? r.data : item));
        this.paymentOpeningId.set(null);
        if (r.data.paymentPayUrl) {
          window.location.href = r.data.paymentPayUrl;
        } else {
          this.toast.error('Không tạo được link thanh toán VNPAY');
        }
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không tạo được link thanh toán VNPAY');
        this.paymentOpeningId.set(null);
      }
    });
  }

  openBookingDetail(bookingId: number): void {
    this.router.navigate(['/bookings', bookingId]);
  }

  goToRoom(roomId: number): void {
    this.router.navigate(['/rooms', roomId]);
  }

  appointmentStatusLabel(status: ViewingAppointmentStatus): string {
    const map: Record<ViewingAppointmentStatus, string> = {
      PENDING: 'Chờ phản hồi',
      ACCEPTED: 'Đã chấp nhận',
      RESCHEDULED: 'Đề xuất giờ khác',
      REJECTED: 'Đã từ chối',
      CANCELLED: 'Đã huỷ',
      COMPLETED: 'Đã hoàn tất'
    };
    return map[status];
  }

  bookingStatusLabel(status: RentalBookingStatus): string {
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

  paymentStatusLabel(status: RentalPaymentStatus): string {
    const map: Record<RentalPaymentStatus, string> = {
      PENDING: 'Chờ thanh toán',
      PAID: 'Đã thanh toán',
      FAILED: 'Thất bại',
      CANCELLED: 'Đã huỷ'
    };
    return map[status];
  }

  private resetActionForms(): void {
    const user = this.auth.user();

    this.appointmentAt = this.toDateTimeLocalValue(new Date());
    this.appointmentMessage = '';
    this.bookingFullName = user?.fullName ?? '';
    this.bookingPhone = user?.phone ?? '';
    this.bookingEmail = user?.email ?? '';
    this.bookingIdentityNumber = '';
    this.bookingMoveInDate = this.toDateValue(new Date());
    this.bookingLeaseMonths = 6;
    this.bookingOccupantCount = 1;
    this.bookingNote = '';
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

  private scrollBottom(): void {
    try {
      const el = this.messagesEl?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {
      // ignore
    }
  }
}
