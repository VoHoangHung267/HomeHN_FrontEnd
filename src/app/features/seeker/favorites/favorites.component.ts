import { Component, ChangeDetectionStrategy, OnInit, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { RoomService } from '../../../core/services/room.service';
import { Room, ROOM_TYPE_LABELS, RoomType } from '../../../core/models';

@Component({
  selector: 'app-favorites',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, RouterLink],
  template: `
<div class="container page">
  <div class="fav-header">
    <h1>Phòng yêu thích</h1>
    <a routerLink="/rooms" class="btn btn-outline">← Tiếp tục tìm kiếm</a>
  </div>

  @if (loading()) {
    <div class="rooms-grid">
      @for (_ of skeletons; track $index) {
        <div class="skeleton" style="height:280px;border-radius:10px"></div>
      }
    </div>
  }

  @if (!loading() && rooms().length === 0) {
    <div class="empty-state">
      <div class="empty-icon">🤍</div>
      <h3>Chưa có phòng yêu thích</h3>
      <p>Nhấn ❤️ trên bất kỳ phòng nào để lưu lại</p>
      <a routerLink="/rooms" class="btn btn-primary">Khám phá phòng</a>
    </div>
  }

  @if (!loading() && rooms().length > 0) {
    <div class="rooms-grid">
      @for (room of rooms(); track room.id) {
        <div class="room-card" (click)="goTo(room.id)">
          <div class="room-image">
            <img [src]="room.primaryImageUrl || 'assets/room-placeholder.jpg'" [alt]="room.title" loading="lazy" />
            <button class="room-fav" (click)="removeFav($event, room)" title="Bỏ yêu thích">❤️</button>
            <span class="room-type-badge">{{ typeLabel(room.roomType) }}</span>
          </div>
          <div class="room-body">
            <div class="room-price">{{ room.price | number:'1.0-0' }}đ<span>/tháng</span></div>
            <div class="room-title">{{ room.title }}</div>
            <div class="room-meta">
              <span>📐 {{ room.area }}m²</span>
              <span>👥 {{ room.maxPeople }} người</span>
            </div>
            <div class="room-location">📍 {{ room.ward }}, {{ room.city }}</div>
          </div>
        </div>
      }
    </div>
  }
</div>
  `,
  styles: [`
    .fav-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; }
    h1 { font-size:22px; font-weight:700; }
    .empty-state { text-align:center; padding:80px 20px; display:flex; flex-direction:column; align-items:center; gap:12px; }
    .empty-icon  { font-size:64px; }
    h3 { font-size:20px; font-weight:600; }
    p  { color:#64748b; }
    .room-price span { font-size:14px; font-weight:400; color:#64748b; }
  `]
})
export class FavoritesComponent implements OnInit {
  private readonly roomService = inject(RoomService);
  private readonly router      = inject(Router);

  rooms   = signal<Room[]>([]);
  loading = signal(false);
  readonly skeletons = Array(4);

  ngOnInit(): void {
    this.loading.set(true);
    this.roomService.getMyFavorites().subscribe({
      next:  r => { this.rooms.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  goTo(id: number): void { this.router.navigate(['/rooms', id]); }

  removeFav(event: Event, room: Room): void {
    event.stopPropagation();
    this.roomService.toggleFavorite(room.id).subscribe(() => {
      this.rooms.update(list => list.filter(r => r.id !== room.id));
    });
  }

  typeLabel(t: RoomType): string { return ROOM_TYPE_LABELS[t] ?? t; }
}
