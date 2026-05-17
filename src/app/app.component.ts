import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { NotificationItem, Room } from './core/models';
import { AiAssistantService, GlobalAssistantResult } from './core/services/ai-assistant.service';
import { AuthService } from './core/services/auth.service';
import { ChatService } from './core/services/chat.service';
import { NotificationService } from './core/services/notification.service';
import { AiSearchResult, RoomService } from './core/services/room.service';

type AssistantMessage = {
  role: 'assistant' | 'user';
  text: string;
  note?: string;
  actionLabel?: string;
  actionUrl?: string;
  suggestedRooms?: Room[];
};

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DatePipe, DecimalPipe, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly chatService = inject(ChatService);
  readonly notifService = inject(NotificationService);
  private readonly aiAssistant = inject(AiAssistantService);
  private readonly roomService = inject(RoomService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  menuOpen = signal(false);
  showNotif = signal(false);
  notifications = signal<NotificationItem[]>([]);
  assistantOpen = signal(false);
  assistantLoading = signal(false);
  assistantError = signal('');
  assistantQuestion = '';
  assistantMessages = signal<AssistantMessage[]>([
    {
      role: 'assistant',
      text: 'Tôi có thể hỗ trợ bạn tìm phòng, giải thích cách dùng website, đặt lịch xem phòng hoặc gợi ý bước tiếp theo.',
      note: 'Nếu bạn mô tả nhu cầu tìm phòng, tôi có thể hiện luôn các phòng phù hợp để bạn bấm vào xem.'
    }
  ]);

  private wasLoggedIn = false;

  constructor() {
    effect(() => {
      const loggedIn = this.auth.isLoggedIn();

      if (loggedIn && !this.wasLoggedIn) {
        this.wasLoggedIn = true;
        this.chatService.connect();
        this.loadNotifications();
      }

      if (!loggedIn && this.wasLoggedIn) {
        this.wasLoggedIn = false;
        this.notifications.set([]);
        this.notifService.unreadCount.set(0);
      }
    });
  }

  ngOnInit(): void {
    const closeNotif = () => this.showNotif.set(false);
    document.addEventListener('click', closeNotif);
    this.destroyRef.onDestroy(() => document.removeEventListener('click', closeNotif));
  }

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
  }

  toggleNotif(event: MouseEvent): void {
    event.stopPropagation();
    this.showNotif.update(v => {
      const next = !v;
      if (next) {
        this.loadNotifications();
      }
      return next;
    });
  }

  toggleAssistant(): void {
    this.assistantOpen.update(v => !v);
  }

  askAssistant(): void {
    if (this.assistantLoading()) {
      return;
    }

    const question = this.assistantQuestion.trim();
    if (!question) {
      this.assistantError.set('Vui lòng nhập câu hỏi cho trợ lý AI.');
      return;
    }

    this.assistantMessages.update(list => [...list, { role: 'user', text: question }]);
    this.assistantQuestion = '';
    this.assistantLoading.set(true);
    this.assistantError.set('');

    const roomSuggestion$ = this.hasSearchKeyword(question)
      ? this.tryGetSuggestedRooms(question)
      : of({ rooms: [] as Room[], note: '' });

    forkJoin({
      assistant: this.aiAssistant.ask(question),
      roomSuggestion: roomSuggestion$
    }).subscribe({
      next: ({ assistant, roomSuggestion }) => {
        this.assistantMessages.update(list => [
          ...list,
          this.mapAssistantResponse(assistant.data, roomSuggestion.rooms, roomSuggestion.note)
        ]);
        this.assistantLoading.set(false);
      },
      error: e => {
        this.assistantError.set(this.formatAssistantError(e.error?.message));
        this.assistantLoading.set(false);
      }
    });
  }

  useAssistantPrompt(prompt: string): void {
    this.assistantQuestion = prompt;
  }

  onAssistantKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.askAssistant();
    }
  }

  openAssistantAction(url: string): void {
    this.router.navigateByUrl(url);
    this.assistantOpen.set(false);
  }

  openSuggestedRoom(roomId: number): void {
    this.router.navigate(['/rooms', roomId]);
    this.assistantOpen.set(false);
  }

  logout(): void {
    this.chatService.disconnect();
    this.auth.logout();
    this.menuOpen.set(false);
  }

  markAllRead(): void {
    this.notifService.readAll().subscribe(() => {
      this.notifications.update(list => list.map(item => ({ ...item, isRead: true })));
      this.notifService.unreadCount.set(0);
    });
  }

  openNotif(item: NotificationItem): void {
    if (!item.isRead) {
      this.notifService.readOne(item.id).subscribe();
      this.notifications.update(list => list.map(x => x.id === item.id ? { ...x, isRead: true } : x));
      this.notifService.unreadCount.update(count => Math.max(0, count - 1));
    }

    if (item.actionUrl) {
      this.router.navigateByUrl(item.actionUrl);
    } else if (item.type === 'REVIEW_RECEIVED' && item.relatedId) {
      this.router.navigate(['/rooms', item.relatedId]);
    } else if (item.type === 'ADMIN_REPORT_RECEIVED') {
      this.router.navigate(['/admin/room-management'], {
        queryParams: { tab: 'reports', reportId: item.relatedId }
      });
    } else if (item.type === 'REPORT_RECEIVED') {
      if (this.auth.isAdmin()) {
        this.router.navigate(['/admin/room-management'], {
          queryParams: { tab: 'reports', reportId: item.relatedId }
        });
      } else {
        this.router.navigate(['/landlord']);
      }
    } else if (item.type === 'REPORT_RESOLVED' && item.relatedId) {
      this.router.navigate(['/rooms', item.relatedId]);
    } else if ((item.type === 'ROOM_APPROVED' || item.type === 'ROOM_REJECTED') && item.relatedId) {
      this.router.navigate(['/rooms', item.relatedId]);
    } else if (item.type === 'APPOINTMENT_REQUESTED' || item.type === 'APPOINTMENT_CANCELLED') {
      this.router.navigate(['/landlord']);
    } else if (item.type === 'APPOINTMENT_UPDATED') {
      this.router.navigate([this.auth.isSeeker() ? '/appointments' : '/landlord']);
    }

    this.showNotif.set(false);
  }

  notifIcon(type: string): string {
    const icons: Record<string, string> = {
      REVIEW_RECEIVED: '★',
      REPORT_RECEIVED: '⚑',
      REPORT_RESOLVED: '✅',
      ADMIN_REPORT_RECEIVED: '⚑',
      ROOM_APPROVED: '✅',
      ROOM_REJECTED: '❌',
      APPOINTMENT_REQUESTED: '📅',
      APPOINTMENT_UPDATED: '📅',
      APPOINTMENT_CANCELLED: '📅',
      BOOKING_CREATED: '🧾',
      BOOKING_UPDATED: '📄',
      BOOKING_DEPOSIT_PAID: '💳'
    };
    return icons[type] ?? '🔔';
  }

  private loadNotifications(): void {
    this.notifService.fetchUnreadCount();
    this.notifService.getAll().subscribe(response => this.notifications.set(response.data));
  }

  private mapAssistantResponse(data: GlobalAssistantResult, rooms: Room[], roomNote?: string): AssistantMessage {
    const baseNote = data.note?.trim() || undefined;
    const mergedNote = roomNote ? [baseNote, roomNote].filter(Boolean).join(' ') : baseNote;

    return {
      role: 'assistant',
      text: data.answer?.trim() || 'Tôi chưa có câu trả lời phù hợp.',
      note: mergedNote || undefined,
      actionLabel: data.actionLabel?.trim() || undefined,
      actionUrl: data.actionUrl?.trim() || undefined,
      suggestedRooms: rooms.length > 0 ? rooms : undefined
    };
  }

  private tryGetSuggestedRooms(question: string) {
    return this.roomService.parseAiSearch({ query: question }).pipe(
      map(response => response.data),
      catchError(() => of(null)),
      map(parsed => this.hasSearchIntent(question, parsed) ? parsed : null),
      map(parsed => parsed ? this.normalizeSearchFilter(parsed) : null),
      switchMap(filter => {
        if (!filter) {
          return of({ rooms: [] as Room[], note: '' });
        }

        return this.roomService.searchRooms({ ...filter, page: 0, size: 3 }).pipe(
          map(response => ({
            rooms: response.data.content,
            note: response.data.content.length > 0
              ? 'Tôi tìm được một vài phòng phù hợp để bạn xem nhanh.'
              : 'Tôi đã hiểu nhu cầu nhưng hiện chưa thấy phòng phù hợp hoàn toàn.'
          })),
          catchError(() => of({ rooms: [] as Room[], note: '' }))
        );
      })
    );
  }

  private hasSearchKeyword(question: string): boolean {
    const q = question.toLowerCase();
    const searchKeywords = [
      'tim phong',
      'can phong',
      'muon thue',
      'thue phong',
      'phong nao',
      'goi y phong',
      'phu hop voi toi',
      'quan',
      'gia',
      'studio',
      'cho o'
    ];
    return searchKeywords.some(keyword => q.includes(keyword));
  }

  private formatAssistantError(message?: string): string {
    if (!message) {
      return 'Khong the lay phan hoi AI luc nay.';
    }

    if (message.includes('RESOURCE_EXHAUSTED') || message.toLowerCase().includes('quota')) {
      const retryDelayMatch = message.match(/retry in\s+([\d.]+)s/i) || message.match(/"retryDelay":\s*"(\d+)s"/i);
      const retrySeconds = retryDelayMatch ? Math.max(1, Math.ceil(Number(retryDelayMatch[1]))) : null;
      return retrySeconds
        ? `AI dang het quota tam thoi. Vui long thu lai sau khoang ${retrySeconds} giay.`
        : 'AI dang het quota tam thoi. Vui long thu lai sau it phut.';
    }

    if (message.includes('PERMISSION_DENIED') || message.toLowerCase().includes('leaked')) {
      return 'Khoa AI tren server dang khong hop le. Can thay API key Gemini moi.';
    }

    return message;
  }

  private hasSearchIntent(question: string, parsed: AiSearchResult | null): boolean {
    const q = question.toLowerCase();
    const searchKeywords = ['tìm phòng', 'cần phòng', 'muốn thuê', 'phòng nào', 'gợi ý phòng', 'phù hợp với tôi', 'dưới', 'quận', 'giá', 'studio'];
    const hinted = searchKeywords.some(keyword => q.includes(keyword));
    const hasParsedSignal = !!(
      parsed?.district ||
      parsed?.keyword ||
      parsed?.minPrice ||
      parsed?.maxPrice ||
      parsed?.minArea ||
      parsed?.maxArea ||
      parsed?.roomType ||
      parsed?.isFurnished !== null && parsed?.isFurnished !== undefined ||
      parsed?.genderRequirement
    );

    return hinted || hasParsedSignal;
  }

  private normalizeSearchFilter(parsed: AiSearchResult) {
    return {
      keyword: parsed.keyword?.trim() || undefined,
      district: parsed.district?.trim() || undefined,
      minPrice: parsed.minPrice ?? undefined,
      maxPrice: parsed.maxPrice ?? undefined,
      minArea: parsed.minArea ?? undefined,
      maxArea: parsed.maxArea ?? undefined,
      roomType: parsed.roomType ?? undefined,
      isFurnished: parsed.isFurnished ?? undefined,
      genderRequirement: parsed.genderRequirement ?? undefined,
      sortBy: parsed.sortBy ?? 'createdAt' as const
    };
  }
}
