import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

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

    @if (message()) {
      <div class="alert alert-success">{{ message() }}</div>
    }
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }

    <form (ngSubmit)="onSubmit()">
      <div class="form-group">
        <label class="form-label">Email</label>
        <input
          type="email"
          class="form-control"
          [(ngModel)]="email"
          name="email"
          required
          placeholder="you@example.com" />
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
  message = signal('');
  error = signal('');

  private readonly auth = inject(AuthService);

  onSubmit(): void {
    this.email = this.email.trim();
    if (!this.email) return;

    this.loading.set(true);
    this.message.set('');
    this.error.set('');

    this.auth.forgotPassword(this.email).subscribe({
      next: r => {
        this.message.set(r.message);
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e.error?.message ?? 'Không thể gửi email đặt lại mật khẩu');
        this.loading.set(false);
      }
    });
  }
}
