import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RoomService } from '../../core/services/room.service';
import { Room, ROOM_TYPE_LABELS, RoomType, WARDS_HN } from '../../core/models';

declare const L: any;

@Component({
  selector: 'app-room-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './room-map.component.html',
  styleUrls: ['./room-map.component.scss']
})
export class RoomMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  private readonly roomService = inject(RoomService);
  private readonly router = inject(Router);

  private map: any = null;
  private markers: any[] = [];
  private clusterGroup: any = null;
  private readonly markerByRoomId = new Map<number, any>();

  rooms = signal<Room[]>([]);
  loading = signal(false);
  selectedRoom = signal<Room | null>(null);
  totalCount = signal(0);

  filterWard = '';
  filterMinPrice = '';
  filterMaxPrice = '';
  filterType = '';

  readonly wards = WARDS_HN;
  readonly roomTypes = Object.entries(ROOM_TYPE_LABELS);

  ngOnInit(): void {
    this.loadRooms();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private initMap(): void {
    if (!this.mapContainer?.nativeElement || typeof L === 'undefined') {
      setTimeout(() => this.initMap(), 500);
      return;
    }

    this.map = L.map(this.mapContainer.nativeElement, {
      center: [21.0285, 105.8542],
      zoom: 12,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(this.map);

    if (L.markerClusterGroup) {
      this.clusterGroup = L.markerClusterGroup({ chunkedLoading: true });
      this.map.addLayer(this.clusterGroup);
    }

    if (this.rooms().length > 0) {
      this.renderMarkers();
    }
  }

  loadRooms(): void {
    this.loading.set(true);
    const filter: Record<string, string | number> = { page: 0, size: 500 };
    if (this.filterWard) filter['ward'] = this.filterWard;
    if (this.filterMinPrice) filter['minPrice'] = this.filterMinPrice;
    if (this.filterMaxPrice) filter['maxPrice'] = this.filterMaxPrice;
    if (this.filterType) filter['roomType'] = this.filterType;

    this.roomService.searchRooms(filter).subscribe({
      next: r => {
        const withCoords = r.data.content.filter(room => room.latitude && room.longitude);
        this.rooms.set(withCoords);
        this.totalCount.set(withCoords.length);
        this.loading.set(false);
        if (this.map) {
          this.renderMarkers();
        }
      },
      error: () => this.loading.set(false)
    });
  }

  applyFilter(): void {
    this.loadRooms();
  }

  resetFilter(): void {
    this.filterWard = '';
    this.filterMinPrice = '';
    this.filterMaxPrice = '';
    this.filterType = '';
    this.loadRooms();
  }

  private renderMarkers(): void {
    if (!this.map || typeof L === 'undefined') return;

    this.markerByRoomId.clear();

    if (this.clusterGroup) {
      this.clusterGroup.clearLayers();
    } else {
      this.markers.forEach(marker => this.map.removeLayer(marker));
      this.markers = [];
    }

    const rooms = this.rooms();
    if (rooms.length === 0) return;

    const createIcon = (price: number) => L.divIcon({
      className: '',
      html: `<div class="map-marker">${(price / 1_000_000).toFixed(1)}M</div>`,
      iconSize: [56, 28],
      iconAnchor: [28, 28],
      popupAnchor: [0, -30]
    });

    rooms.forEach(room => {
      const marker = L.marker([room.latitude, room.longitude], { icon: createIcon(room.price) });
      const popupHtml = this.buildPopupHtml(room);

      marker.bindPopup(popupHtml, { maxWidth: 260 });
      marker.on('click', () => this.selectedRoom.set(room));
      marker.on('popupopen', (event: any) => {
        const popupEl = event.popup?.getElement?.() as HTMLElement | undefined;
        const card = popupEl?.querySelector('.map-popup-card') as HTMLElement | null;
        if (!card) return;

        card.onclick = () => this.goToRoom(room.id);
        card.onkeydown = (keyboardEvent: KeyboardEvent) => {
          if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
            keyboardEvent.preventDefault();
            this.goToRoom(room.id);
          }
        };
      });

      this.markerByRoomId.set(room.id, marker);

      if (this.clusterGroup) {
        this.clusterGroup.addLayer(marker);
      } else {
        marker.addTo(this.map);
        this.markers.push(marker);
      }
    });

    const latlngs = rooms.map(room => [room.latitude, room.longitude]);
    try {
      this.map.fitBounds(latlngs as any, { padding: [40, 40], maxZoom: 15 });
    } catch {
      // ignore
    }
  }

  private buildPopupHtml(room: Room): string {
    const imageUrl = room.primaryImageUrl || 'assets/room-placeholder.jpg';
    const location = this.escapeHtml(`${room.ward}, ${room.city}`);
    const title = this.escapeHtml(room.title);
    const price = `${room.price.toLocaleString('vi-VN')}đ/tháng`;
    const meta = `${room.area}m² · ${room.maxPeople} người`;

    return `
      <div class="map-popup-card" role="button" tabindex="0" aria-label="Xem chi tiết phòng">
        <img src="${imageUrl}" onerror="this.src='assets/room-placeholder.jpg'" alt="${title}" />
        <div class="popup-body">
          <div class="popup-price">${price}</div>
          <div class="popup-title">${title}</div>
          <div class="popup-loc">📍 ${location}</div>
          <div class="popup-meta">📐 ${meta}</div>
          <div class="popup-hint">Bấm để xem chi tiết phòng</div>
        </div>
      </div>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  goToRoom(id: number): void {
    this.router.navigate(['/rooms', id]);
  }

  focusRoom(room: Room): void {
    if (!this.map) return;
    this.map.setView([room.latitude, room.longitude], 16);
    this.selectedRoom.set(room);
    this.markerByRoomId.get(room.id)?.openPopup();
  }

  typeLabel(type: RoomType): string {
    return ROOM_TYPE_LABELS[type] ?? type;
  }
}
