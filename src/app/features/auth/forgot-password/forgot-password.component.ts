import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink],
  template: `
<div class="auth-page">
  <div class="auth-card">
    <div class="auth-header">
      <div class="auth-logo">🏠</div>
      <h1>Quên mật khẩu</h1>
      <p>Nhập email để nhận liên kết đặt lại mật khẩu</p>
    </div>

    <form (ngSubmit)="onSubmit()">
      <div class="form-group">
        <label class="form-label">Email</label>
        <input type="email" class="form-control" [(ngModel)]="email" name="email" required placeholder="you@example.com" />
      </div>

      <button type="submit" class="btn btn-primary btn-block btn-lg" [disabled]="loading()">
        @if (loading()) { Đang gửi... } @else { Gửi liên kết }
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
export class ForgotPasswordComponent {
  email = '';
  loading = signal(false);

  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  onSubmit(): void {
    this.email = this.email.trim();
    if (!this.email) {
      this.toast.error('Vui lòng nhập email');
      return;
    }

    this.loading.set(true);
    this.auth.forgotPassword(this.email).subscribe({
      next: r => {
        this.toast.success(r.message);
        this.loading.set(false);
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không thể gửi email đặt lại mật khẩu');
        this.loading.set(false);
      }
    });
  }
}
