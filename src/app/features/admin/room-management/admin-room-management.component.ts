import { Component, ChangeDetectionStrategy, DestroyRef, OnInit, signal, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { AdminService, AdminRoomFilter, ReportItem } from '../../../core/services/admin.service';
import { Room, ROOM_TYPE_LABELS, STATUS_LABELS, RoomStatus, DISTRICTS_HN } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-room-management',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, DatePipe, DecimalPipe],
  templateUrl: './admin-room-management.component.html',
  styleUrls: ['./admin-room-management.component.scss']
})
export class AdminRoomManagementComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);

  // â”€â”€ Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  activeTab = signal<'rooms' | 'reports'>('rooms');

  // â”€â”€ Rooms â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  rooms         = signal<Room[]>([]);
  totalRooms    = signal(0);
  totalPages    = signal(0);
  currentPage   = signal(0);
  loadingRooms  = signal(false);

  filter: AdminRoomFilter = { page: 0, size: 20 };
  readonly districts   = ['', ...DISTRICTS_HN];
  readonly statusOpts  = [
    { value: '', label: 'Tất cả' },
    { value: 'ACTIVE',   label: 'Đang hiăn thị' },
    { value: 'PENDING',  label: 'Chờ duyệt' },
    { value: 'HIDDEN',   label: 'Đã ẩn' },
    { value: 'REJECTED', label: 'Bị từ chối' },
    { value: 'EXPIRED',  label: 'Hết hạn' },
    { value: 'RENTED',   label: 'Đã cho thuê' },
  ];

  // â”€â”€ Reports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  reports        = signal<ReportItem[]>([]);
  reportStatus   = signal<string>('PENDING');
  loadingReports = signal(false);
  resolveNote    = signal('');
  selectedReport = signal<ReportItem | null>(null);
  focusedReportId = signal<number | null>(null);

  readonly reportStatusOpts = [
    { value: 'PENDING',   label: 'Chờ xử lý' },
    { value: 'REVIEWED',  label: 'Đang xem xét' },
    { value: 'RESOLVED',  label: 'Đã xử lý' },
    { value: 'DISMISSED', label: 'Bỏ qua' },
  ];

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const reportId = Number(params.get('reportId'));
        if (params.get('tab') === 'reports') {
          this.activeTab.set('reports');
        }
        if (Number.isFinite(reportId) && reportId > 0) {
          this.focusReport(reportId);
        } else {
          this.loadReports();
        }
      });
    this.loadRooms();
  }

  // â”€â”€ Room methods â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  loadRooms(): void {
    this.loadingRooms.set(true);
    this.adminService.getAllRooms({ ...this.filter, page: this.currentPage() }).subscribe({
      next: r => {
        this.rooms.set(r.data.content);
        this.totalRooms.set(r.data.totalElements);
        this.totalPages.set(this.calculateTotalPages(r.data.totalPages, r.data.totalElements, r.data.size));
        this.loadingRooms.set(false);
      },
      error: () => this.loadingRooms.set(false)
    });
  }

  applyFilter(): void { this.currentPage.set(0); this.loadRooms(); }
  resetFilter(): void { this.filter = { page: 0, size: 20 }; this.applyFilter(); }
  changePage(p: number): void {
    if (p < 0 || p >= this.resolvedTotalPages()) return;
    this.currentPage.set(p);
    this.loadRooms();
  }

  toggleHidden(room: Room): void {
    this.adminService.toggleHiddenRoom(room.id).subscribe(() => {
      this.rooms.update(list => list.map(r =>
        r.id === room.id
          ? { ...r, status: (r.status === 'HIDDEN' ? 'ACTIVE' : 'HIDDEN') as RoomStatus }
          : r
      ));
    });
  }

  deleteRoom(room: Room): void {
    if (!confirm(`Xác nhận xoá phòng "${room.title}"?\nHành động này không thể hoàn tác.`)) return;
    this.adminService.deleteRoom(room.id).subscribe(() => {
      this.rooms.update(list => list.filter(r => r.id !== room.id));
      this.totalRooms.update(n => n - 1);
    });
  }

  statusLabel(s: RoomStatus): string { return STATUS_LABELS[s] ?? s; }
  typeLabel(t: string): string { return (ROOM_TYPE_LABELS as Record<string, string>)[t] ?? t; }

  pageNumbers(): number[] {
    const cur = this.currentPage(), total = this.resolvedTotalPages();
    const start = Math.max(0, cur - 2);
    const end   = Math.min(total - 1, cur + 2);
    const length = Math.max(0, end - start + 1);
    return Array.from({ length }, (_, i) => start + i);
  }

  paginationLabel(): string {
    const total = this.resolvedTotalPages();
    if (total === 0) return 'Trang 0 / 0';
    return `Trang ${this.currentPage() + 1} / ${total}`;
  }

  // â”€â”€ Report methods â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  loadReports(): void {
    this.loadingReports.set(true);
    this.adminService.getReports(this.reportStatus()).subscribe({
      next: r => {
        this.reports.set(r.data);
        this.loadingReports.set(false);
        this.scrollToFocusedReport();
      },
      error: () => this.loadingReports.set(false)
    });
  }

  focusReport(reportId: number): void {
    this.focusedReportId.set(reportId);
    this.adminService.getReport(reportId).subscribe({
      next: r => {
        this.reportStatus.set(r.data.status);
        this.loadReports();
      },
      error: () => this.loadReports()
    });
  }

  openResolve(report: ReportItem): void {
    this.selectedReport.set(report);
    this.resolveNote.set('');
  }

  confirmResolve(newStatus: string): void {
    const r = this.selectedReport();
    if (!r) return;
    const note = this.resolveNote().trim();
    if (!note) { this.toast.error('Vui lòng nhập ghi chú xử lý'); return; }
    this.adminService.resolveReport(r.id, note, newStatus).subscribe(() => {
      this.reports.update(list => list.filter(x => x.id !== r.id));
      this.selectedReport.set(null);
      this.toast.success('Đã cập nhật trạng thái báo cáo');
    });
  }

  reportStatusLabel(s: string): string {
    return this.reportStatusOpts.find(o => o.value === s)?.label ?? s;
  }

  private scrollToFocusedReport(): void {
    const id = this.focusedReportId();
    if (!id) return;
    setTimeout(() => {
      document.getElementById(`report-${id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  private resolvedTotalPages(): number {
    return this.calculateTotalPages(this.totalPages(), this.totalRooms(), this.filter.size);
  }

  private calculateTotalPages(totalPages: number | undefined, totalElements: number | undefined, pageSize: number | undefined): number {
    if (Number.isFinite(totalPages) && Number(totalPages) > 0) {
      return Number(totalPages);
    }
    const safeSize = Number(pageSize) || this.filter.size || 1;
    const safeTotalElements = Number(totalElements) || 0;
    return safeTotalElements > 0 ? Math.ceil(safeTotalElements / safeSize) : 0;
  }
}
