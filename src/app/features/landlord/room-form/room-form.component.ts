import {
  Component, ChangeDetectionStrategy, OnInit, AfterViewInit, OnDestroy,
  signal, inject, ViewChild, ElementRef
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { KeyValuePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, Subject, switchMap, of, catchError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ExtractRoomFormResult, RoomService } from '../../../core/services/room.service';
import {
  RoomFormData, ROOM_TYPE_LABELS, DISTRICTS_HN,
  AMENITIES_LIST, GeoResult
} from '../../../core/models';

declare const L: any;

@Component({
  selector: 'app-room-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, KeyValuePipe],
  templateUrl: './room-form.component.html',
  styleUrls: ['./room-form.component.scss']
})
export class RoomFormComponent implements OnInit, AfterViewInit, OnDestroy {
  private static readonly LIMITS = {
    titleMaxLength: 255,
    descriptionMaxLength: 5000,
    addressMaxLength: 255,
    wardMaxLength: 255,
    districtMaxLength: 255,
    cityMaxLength: 255,
    priceMax: 9_999_999_999.99,
    areaMin: 5,
    areaMax: 999_999.99,
    feeMax: 99_999_999.99,
    maxPeopleMin: 1,
    maxPeopleMax: 10
  } as const;

  @ViewChild('locationMap') locationMapEl!: ElementRef<HTMLDivElement>;

  private readonly roomService = inject(RoomService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  isEditMode = false;
  roomId: number | null = null;

  loading = signal(false);
  error = signal('');
  success = signal('');
  aiLoading = signal(false);
  aiError = signal('');
  aiDraft = '';

  form: RoomFormData & { latitude?: number; longitude?: number } = {
    title: '',
    description: '',
    price: null,
    area: null,
    electricPrice: 0,
    waterPrice: 0,
    otherFees: 0,
    address: '',
    ward: '',
    district: '',
    city: 'Hà Nội',
    latitude: undefined,
    longitude: undefined,
    roomType: 'PHONG_TRO',
    isFurnished: false,
    maxPeople: 2,
    genderRequirement: 'ALL',
    amenities: []
  };

  selectedFiles = signal<File[]>([]);
  previewImages = signal<string[]>([]);

  readonly roomTypes = ROOM_TYPE_LABELS;
  readonly districts = DISTRICTS_HN;
  readonly amenitiesList = AMENITIES_LIST;
  readonly limits = RoomFormComponent.LIMITS;

  private map: any = null;
  private marker: any = null;
  mapReady = signal(false);
  searchQuery = signal('');
  searchResults = signal<GeoResult[]>([]);
  searching = signal(false);
  showResults = signal(false);
  coordDisplay = signal('');

  private readonly searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(q => {
        if (q.length < 3) {
          this.searchResults.set([]);
          return of([]);
        }
        this.searching.set(true);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ', Việt Nam')}&limit=5&addressdetails=1`;
        return this.http.get<GeoResult[]>(url).pipe(catchError(() => of([])));
      }),
      takeUntilDestroyed()
    ).subscribe(results => {
      this.searchResults.set(results as GeoResult[]);
      this.showResults.set((results as GeoResult[]).length > 0);
      this.searching.set(false);
    });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.roomId = id;
    this.isEditMode = !!id;

    if (this.isEditMode && id) {
      this.roomService.getById(id).subscribe(r => {
        const room = r.data;
        this.form = {
          title: room.title,
          description: room.description,
          price: room.price,
          area: room.area,
          electricPrice: room.electricPrice,
          waterPrice: room.waterPrice,
          otherFees: room.otherFees,
          address: room.address,
          ward: room.ward,
          district: room.district,
          city: room.city,
          latitude: room.latitude,
          longitude: room.longitude,
          roomType: room.roomType,
          isFurnished: room.isFurnished,
          maxPeople: room.maxPeople,
          genderRequirement: room.genderRequirement,
          amenities: [...room.amenities]
        };
        this.searchQuery.set(room.address);
        if (room.latitude && room.longitude) {
          this.updateCoordDisplay(room.latitude, room.longitude);
        }
        if (this.map && room.latitude && room.longitude) {
          this.setMarker(room.latitude, room.longitude);
          this.map.setView([room.latitude, room.longitude], 16);
        }
      });
    }
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
    if (typeof L === 'undefined' || !this.locationMapEl?.nativeElement) {
      setTimeout(() => this.initMap(), 600);
      return;
    }

    this.map = L.map(this.locationMapEl.nativeElement, {
      center: [21.0285, 105.8542],
      zoom: 13,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(this.map);

    this.map.on('click', (e: any) => {
      this.setMarker(e.latlng.lat, e.latlng.lng);
      this.form.latitude = e.latlng.lat;
      this.form.longitude = e.latlng.lng;
      this.updateCoordDisplay(e.latlng.lat, e.latlng.lng);
      this.reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    this.mapReady.set(true);

    if (this.form.latitude && this.form.longitude) {
      this.setMarker(this.form.latitude, this.form.longitude);
      this.map.setView([this.form.latitude, this.form.longitude], 16);
    }
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.showResults.set(false);
    this.searchSubject.next(value);
  }

  selectResult(result: GeoResult): void {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    this.form.latitude = lat;
    this.form.longitude = lon;
    this.searchQuery.set(result.display_name.split(',').slice(0, 3).join(', '));
    this.showResults.set(false);
    this.updateCoordDisplay(lat, lon);

    if (!this.form.address) {
      const addr = result.address;
      this.form.address = [addr.road, addr.suburb].filter(Boolean).join(', ');
    }

    if (this.map) {
      this.setMarker(lat, lon);
      this.map.setView([lat, lon], 17);
    }
  }

  private reverseGeocode(lat: number, lon: number): void {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
    this.http.get<any>(url).subscribe(r => {
      if (r?.address) {
        const addr = r.address;
        const parts = [addr.road, addr.suburb || addr.neighbourhood].filter(Boolean);
        if (parts.length > 0 && !this.form.address) {
          this.form.address = parts.join(', ');
        }
        this.searchQuery.set(r.display_name.split(',').slice(0, 3).join(', '));
      }
    });
  }

  private setMarker(lat: number, lon: number): void {
    if (!this.map) return;

    const icon = L.divIcon({
      className: '',
      html: `<div class="form-map-pin">📍</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    if (this.marker) {
      this.marker.setLatLng([lat, lon]);
    } else {
      this.marker = L.marker([lat, lon], {
        icon,
        draggable: true
      }).addTo(this.map);

      this.marker.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        this.form.latitude = pos.lat;
        this.form.longitude = pos.lng;
        this.updateCoordDisplay(pos.lat, pos.lng);
        this.reverseGeocode(pos.lat, pos.lng);
      });
    }
  }

  clearLocation(): void {
    this.form.latitude = undefined;
    this.form.longitude = undefined;
    this.coordDisplay.set('');
    this.searchQuery.set('');
    if (this.marker && this.map) {
      this.map.removeLayer(this.marker);
      this.marker = null;
    }
  }

  private updateCoordDisplay(lat: number, lon: number): void {
    this.coordDisplay.set(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
  }

  toggleAmenity(a: string): void {
    const idx = this.form.amenities.indexOf(a);
    if (idx >= 0) {
      this.form.amenities.splice(idx, 1);
    } else {
      this.form.amenities.push(a);
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.addFiles(Array.from(input.files));
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files) this.addFiles(Array.from(event.dataTransfer.files));
  }

  private addFiles(files: File[]): void {
    const remaining = 10 - this.selectedFiles().length;
    files.slice(0, remaining).forEach(file => {
      this.selectedFiles.update(list => [...list, file]);
      const reader = new FileReader();
      reader.onload = e => {
        this.previewImages.update(list => [...list, e.target!.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }

  removeImage(i: number): void {
    this.selectedFiles.update(list => list.filter((_, idx) => idx !== i));
    this.previewImages.update(list => list.filter((_, idx) => idx !== i));
  }

  fillFormWithAi(): void {
    this.aiError.set('');
    this.success.set('');

    if (!this.aiDraft.trim()) {
      this.aiError.set('Vui lòng nhập mô tả tự do trước khi dùng AI.');
      return;
    }

    this.aiLoading.set(true);
    this.roomService.extractRoomForm({
      rawDescription: this.aiDraft.trim()
    }).subscribe({
      next: r => {
        this.applyAiFormData(r.data);
        this.success.set(r.data.note?.trim()
          ? `AI đã điền các trường nhận diện được. ${r.data.note.trim()}`
          : 'AI đã điền các trường nhận diện được vào form.');
        this.aiLoading.set(false);
      },
      error: e => {
        this.aiError.set(e.error?.message ?? 'Không thể phân tích mô tả bằng AI lúc này.');
        this.aiLoading.set(false);
      }
    });
  }

  private applyAiFormData(data: ExtractRoomFormResult): void {
    if (data.title?.trim()) this.form.title = data.title.trim();
    if (data.description?.trim()) this.form.description = data.description.trim();
    if (data.price !== null && data.price !== undefined) this.form.price = Number(data.price);
    if (data.area !== null && data.area !== undefined) this.form.area = Number(data.area);
    if (data.electricPrice !== null && data.electricPrice !== undefined) this.form.electricPrice = Number(data.electricPrice);
    if (data.waterPrice !== null && data.waterPrice !== undefined) this.form.waterPrice = Number(data.waterPrice);
    if (data.otherFees !== null && data.otherFees !== undefined) this.form.otherFees = Number(data.otherFees);
    if (data.address?.trim()) this.form.address = data.address.trim();
    if (data.ward?.trim()) this.form.ward = data.ward.trim();
    if (data.district?.trim()) this.form.district = data.district.trim();
    if (data.city?.trim()) this.form.city = data.city.trim();
    if (data.roomType) this.form.roomType = data.roomType;
    if (data.isFurnished !== null && data.isFurnished !== undefined) this.form.isFurnished = data.isFurnished;
    if (data.maxPeople !== null && data.maxPeople !== undefined) this.form.maxPeople = Number(data.maxPeople);
    if (data.genderRequirement) this.form.genderRequirement = data.genderRequirement;
    if (data.amenities?.length) {
      this.form.amenities = this.amenitiesList.filter(item => data.amenities?.includes(item));
    }
  }

  onSubmit(): void {
    const validationError = this.validateForm();
    if (validationError) {
      this.error.set(validationError);
      return;
    }
    this.loading.set(true);
    this.error.set('');

    const req$ = this.isEditMode && this.roomId
      ? this.roomService.updateRoom(this.roomId, this.form)
      : this.roomService.createRoom(this.form);

    req$.subscribe({
      next: r => {
        const id = r.data.id;
        const files = this.selectedFiles();
        if (files.length > 0) {
          this.roomService.uploadImages(id, files).subscribe({
            next: () => this.finish(),
            error: () => this.finish()
          });
        } else {
          this.finish();
        }
      },
      error: e => {
        this.error.set(this.resolveErrorMessage(e));
        this.loading.set(false);
      }
    });
  }

  private validateForm(): string | null {
    if (!this.form.title?.trim() || this.form.price == null || this.form.area == null
      || !this.form.district?.trim() || !this.form.address?.trim() || !this.form.city?.trim()) {
      return 'Vui lòng điền đầy đủ thông tin bắt buộc (*)';
    }

    if (this.form.title.trim().length > this.limits.titleMaxLength) {
      return `Tiêu đề không được vượt quá ${this.limits.titleMaxLength} ký tự`;
    }

    if ((this.form.description ?? '').trim().length > this.limits.descriptionMaxLength) {
      return `Mô tả không được vượt quá ${this.limits.descriptionMaxLength} ký tự`;
    }

    if (this.form.address.trim().length > this.limits.addressMaxLength) {
      return `Địa chỉ không được vượt quá ${this.limits.addressMaxLength} ký tự`;
    }

    if ((this.form.ward ?? '').trim().length > this.limits.wardMaxLength) {
      return `Phường/xã không được vượt quá ${this.limits.wardMaxLength} ký tự`;
    }

    if (this.form.district.trim().length > this.limits.districtMaxLength) {
      return `Quận/huyện không được vượt quá ${this.limits.districtMaxLength} ký tự`;
    }

    if (this.form.city.trim().length > this.limits.cityMaxLength) {
      return `Thành phố không được vượt quá ${this.limits.cityMaxLength} ký tự`;
    }

    if (this.form.price <= 0 || this.form.price > this.limits.priceMax) {
      return `Giá thuê phải lớn hơn 0 và không vượt quá ${this.limits.priceMax.toLocaleString('vi-VN')}`;
    }

    if (this.form.area < this.limits.areaMin || this.form.area > this.limits.areaMax) {
      return `Diện tích phải từ ${this.limits.areaMin} đến ${this.limits.areaMax.toLocaleString('vi-VN')} m²`;
    }

    if (this.form.electricPrice < 0 || this.form.electricPrice > this.limits.feeMax) {
      return `Giá điện phải từ 0 đến ${this.limits.feeMax.toLocaleString('vi-VN')}`;
    }

    if (this.form.waterPrice < 0 || this.form.waterPrice > this.limits.feeMax) {
      return `Giá nước phải từ 0 đến ${this.limits.feeMax.toLocaleString('vi-VN')}`;
    }

    if (this.form.otherFees < 0 || this.form.otherFees > this.limits.feeMax) {
      return `Phí khác phải từ 0 đến ${this.limits.feeMax.toLocaleString('vi-VN')}`;
    }

    if (this.form.maxPeople < this.limits.maxPeopleMin || this.form.maxPeople > this.limits.maxPeopleMax) {
      return `Số người tối đa phải từ ${this.limits.maxPeopleMin} đến ${this.limits.maxPeopleMax}`;
    }

    return null;
  }

  private resolveErrorMessage(error: any): string {
    const fieldErrors = error?.error?.data;
    if (fieldErrors && typeof fieldErrors === 'object') {
      const firstFieldError = Object.values(fieldErrors).find(value => typeof value === 'string');
      if (typeof firstFieldError === 'string' && firstFieldError.trim()) {
        return firstFieldError;
      }
    }
    return error?.error?.message ?? 'Đã có lỗi xảy ra. Vui lòng thử lại.';
  }

  private finish(): void {
    this.success.set(this.isEditMode
      ? 'Cập nhật phòng thành công!'
      : 'Đăng phòng thành công! Chờ admin duyệt.');
    setTimeout(() => this.router.navigate(['/landlord']), 1500);
  }
}
