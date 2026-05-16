import {
  Component, ChangeDetectionStrategy, OnInit, OnDestroy,
  signal, inject, ElementRef, ViewChild, AfterViewInit
} from '@angular/core';
import { Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoomService } from '../../core/services/room.service';
import { Room, ROOM_TYPE_LABELS, RoomType, DISTRICTS_HN } from '../../core/models';

// Leaflet type declaration (loaded via CDN in index.html)
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
  private readonly router      = inject(Router);

  // â”€â”€ Map state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private map: any      = null;
  private markers: any[] = [];
  private clusterGroup: any = null;

  // â”€â”€ Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  rooms         = signal<Room[]>([]);
  loading       = signal(false);
  selectedRoom  = signal<Room | null>(null);
  totalCount    = signal(0);

  // â”€â”€ Filters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  filterDistrict = '';
  filterMinPrice = '';
  filterMaxPrice = '';
  filterType     = '';

  readonly districts = DISTRICTS_HN;
  readonly roomTypes = Object.entries(ROOM_TYPE_LABELS);

  ngOnInit(): void {
    this.loadRooms();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) { this.map.remove(); this.map = null; }
  }

  private initMap(): void {
    if (!this.mapContainer?.nativeElement || typeof L === 'undefined') {
      // Retry sau 500ms nếu Leaflet chưa load
      setTimeout(() => this.initMap(), 500);
      return;
    }

    this.map = L.map(this.mapContainer.nativeElement, {
      center: [21.0285, 105.8542], // Hà Nội
      zoom: 12,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(this.map);

    // Dùng MarkerClusterGroup nếu plugin có sẵn
    if (L.markerClusterGroup) {
      this.clusterGroup = L.markerClusterGroup({ chunkedLoading: true });
      this.map.addLayer(this.clusterGroup);
    }

    // Thêm markers nếu đã có data
    if (this.rooms().length > 0) {
      this.renderMarkers();
    }
  }

  loadRooms(): void {
    this.loading.set(true);
    const filter: any = { page: 0, size: 500 }; // Load nhiều phòng để hiện trên map
    if (this.filterDistrict) filter.district = this.filterDistrict;
    if (this.filterMinPrice) filter.minPrice = this.filterMinPrice;
    if (this.filterMaxPrice) filter.maxPrice = this.filterMaxPrice;
    if (this.filterType)     filter.roomType = this.filterType;

    this.roomService.searchRooms(filter).subscribe({
      next: r => {
        // Ch? l?y ph?ng c? t?a ??
        const withCoords = r.data.content.filter(room => room.latitude && room.longitude);
        this.rooms.set(withCoords);
        this.totalCount.set(r.data.totalElements);
        this.loading.set(false);
        if (this.map) this.renderMarkers();
      },
      error: () => this.loading.set(false)
    });
  }

  applyFilter(): void { this.loadRooms(); }
  resetFilter(): void {
    this.filterDistrict = '';
    this.filterMinPrice = '';
    this.filterMaxPrice = '';
    this.filterType     = '';
    this.loadRooms();
  }

  private renderMarkers(): void {
    if (!this.map || typeof L === 'undefined') return;

    // Xoá markers cũ
    if (this.clusterGroup) {
      this.clusterGroup.clearLayers();
    } else {
      this.markers.forEach(m => this.map.removeLayer(m));
      this.markers = [];
    }

    const rooms = this.rooms();
    if (rooms.length === 0) return;

    // Custom icon
    const createIcon = (price: number) => L.divIcon({
      className: '',
      html: `<div class="map-marker">${(price / 1000000).toFixed(1)}M</div>`,
      iconSize: [56, 28],
      iconAnchor: [28, 28],
      popupAnchor: [0, -30]
    });

    rooms.forEach(room => {
      const marker = L.marker([room.latitude, room.longitude], { icon: createIcon(room.price) });

      // Popup khi click
      const popupHtml = `
        <div class="map-popup">
          <img src="${room.primaryImageUrl || 'assets/room-placeholder.jpg'}"
               onerror="this.src='assets/room-placeholder.jpg'" />
          <div class="popup-body">
            <div class="popup-price">${room.price.toLocaleString('vi-VN')}đ/tháng</div>
            <div class="popup-title">${room.title}</div>
            <div class="popup-loc">📍 ${room.district}</div>
            <div class="popup-meta">?? ${room.area}m? ? ?? ${room.maxPeople} ng??i</div>
          </div>
        </div>`;

      marker.bindPopup(popupHtml, { maxWidth: 240 });
      marker.on('click', () => this.selectedRoom.set(room));

      if (this.clusterGroup) {
        this.clusterGroup.addLayer(marker);
      } else {
        marker.addTo(this.map);
        this.markers.push(marker);
      }
    });

    // Fit map bounds
    if (rooms.length > 0) {
      const latlngs = rooms.map(r => [r.latitude, r.longitude]);
      try {
        this.map.fitBounds(latlngs as any, { padding: [40, 40], maxZoom: 15 });
      } catch { /* ignore */ }
    }
  }

  goToRoom(id: number): void {
    this.router.navigate(['/rooms', id]);
  }

  focusRoom(room: Room): void {
    if (!this.map) return;
    this.map.setView([room.latitude, room.longitude], 16);
    this.selectedRoom.set(room);
  }

  typeLabel(t: RoomType): string { return ROOM_TYPE_LABELS[t] ?? t; }
}
