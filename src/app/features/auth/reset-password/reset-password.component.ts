import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink],
  template: `
<div class="auth-page">
  <div class="auth-card">
    <div class="auth-header">
      <div class="auth-logo">🏠</div>
      <h1>Đặt lại mật khẩu</h1>
      <p>Tạo mật khẩu mới cho tài khoản của bạn</p>
    </div>

    @if (message()) {
      <div class="alert alert-success">{{ message() }}</div>
    }
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }

    <form (ngSubmit)="onSubmit()">
      <div class="form-group">
        <label class="form-label">Mật khẩu mới</label>
        <input type="password" class="form-control" [(ngModel)]="newPassword"
               name="newPassword" required minlength="6" placeholder="Ít nhất 6 ký tự" />
      </div>

      <div class="form-group">
        <label class="form-label">Nhập lại mật khẩu</label>
        <input type="password" class="form-control" [(ngModel)]="confirmPassword"
               name="confirmPassword" required minlength="6" />
      </div>

      <button type="submit" class="btn btn-primary btn-block btn-lg" [disabled]="loading() || !token">
        @if (loading()) { Đang cập nhật... } @else { Đặt lại mật khẩu }
      </button>
    </form>

    <div class="auth-footer">
      <a routerLink="/auth/login">Quay lại đăng nhập</a>
    </div>
  </div>
</div>
  `,
  styleUrls: ['../auth.scss']
})
export class ResetPasswordComponent {
  token = '';
  newPassword = '';
  confirmPassword = '';
  loading = signal(false);
  message = signal('');
  error = signal('');

  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  constructor() {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.error.set('Liên kết đặt lại mật khẩu không hợp lệ');
    }
  }

  onSubmit(): void {
    if (!this.token) return;
    if (this.newPassword.length < 6) {
      this.error.set('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error.set('Mật khẩu nhập lại không khớp');
      return;
    }

    this.loading.set(true);
    this.message.set('');
    this.error.set('');

    this.auth.resetPassword(this.token, this.newPassword).subscribe({
      next: r => {
        this.message.set(r.message);
        this.loading.set(false);
        setTimeout(() => this.router.navigate(['/auth/login']), 1200);
      },
      error: e => {
        this.error.set(e.error?.message ?? 'Không thể đặt lại mật khẩu');
        this.loading.set(false);
      }
    });
  }
}
