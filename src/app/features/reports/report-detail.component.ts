import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReportItem } from '../../core/services/admin.service';
import { ReportService } from '../../core/services/report.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-report-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe],
  templateUrl: './report-detail.component.html',
  styleUrls: ['./report-detail.component.scss']
})
export class ReportDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reportService = inject(ReportService);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(AuthService);

  report = signal<ReportItem | null>(null);
  loading = signal(true);
  error = signal('');
  responseType = signal<'WILL_FIX' | 'CONTEST'>('WILL_FIX');
  responseNote = signal('');
  responseSaving = signal(false);
  responseError = signal('');

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const id = Number(params.get('id'));
        if (!id) {
          this.error.set('Báo cáo không hợp lệ');
          this.loading.set(false);
          return;
        }
        this.fetchReport(id);
      });
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'Chờ xử lý',
      REVIEWED: 'Đang xem xét',
      RESOLVED: 'Đã xử lý',
      DISMISSED: 'Bỏ qua'
    };
    return labels[status] ?? status;
  }

  backLink(): string {
    if (this.auth.isAdmin()) return '/admin/room-management';
    if (this.auth.isLandlord()) return '/landlord';
    return '/rooms';
  }

  landlordResponseLabel(type?: string): string {
    const labels: Record<string, string> = {
      WILL_FIX: 'Sẽ chỉnh sửa phòng',
      CONTEST: 'Khiếu nại báo cáo không đúng sự thật'
    };
    return type ? (labels[type] ?? type) : '';
  }

  canLandlordRespond(): boolean {
    const report = this.report();
    return !!report && this.auth.isLandlord() && report.status === 'REVIEWED' && !report.landlordResponseType;
  }

  submitLandlordResponse(): void {
    const report = this.report();
    const note = this.responseNote().trim();
    if (!report) return;
    if (!note) {
      this.responseError.set('Vui lòng nhập nội dung phản hồi cho admin');
      return;
    }

    this.responseSaving.set(true);
    this.responseError.set('');
    this.reportService.submitLandlordResponse(report.id, this.responseType(), note).subscribe({
      next: r => {
        this.report.set(r.data);
        this.responseSaving.set(false);
      },
      error: e => {
        this.responseError.set(e.error?.message ?? 'Không thể gửi phản hồi');
        this.responseSaving.set(false);
      }
    });
  }

  private fetchReport(id: number): void {
    this.loading.set(true);
    this.error.set('');
    this.reportService.getDetail(id).subscribe({
      next: r => {
        this.report.set(r.data);
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e.error?.message ?? 'Không thể tải chi tiết báo cáo');
        this.loading.set(false);
      }
    });
  }
}
