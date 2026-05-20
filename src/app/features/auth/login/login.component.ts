import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink],
  template: `
<div class="auth-page">
  <div class="auth-card">
    <div class="auth-header">
      <div class="auth-logo">🏠</div>
      <h1>Đăng nhập</h1>
      <p>Chào mừng bạn trở lại HomeHN.vn</p>
    </div>

    <form (ngSubmit)="onSubmit()">
      <div class="form-group">
        <label class="form-label">Email</label>
        <input type="email" class="form-control" [(ngModel)]="email"
               name="email" required placeholder="you@example.com" />
      </div>

      <div class="form-group">
        <label class="form-label">Mật khẩu</label>
        <div class="password-wrap">
          <input [type]="showPwd() ? 'text' : 'password'" class="form-control"
                 [(ngModel)]="password" name="password" required placeholder="••••••••" />
          <button type="button" class="pwd-toggle" (click)="showPwd.update(v => !v)">
            {{ showPwd() ? 'Ẩn' : 'Hiện' }}
          </button>
        </div>
        <div style="text-align:right;margin-top:8px">
          <a routerLink="/auth/forgot-password">Quên mật khẩu?</a>
        </div>
      </div>

      <button type="submit" class="btn btn-primary btn-block btn-lg" [disabled]="loading()">
        @if (loading()) { <span class="spinner"></span> Đang đăng nhập... }
        @else { Đăng nhập }
      </button>
    </form>

    <div class="auth-footer">
      <span>Chưa có tài khoản?</span>
      <a routerLink="/auth/register">Đăng ký ngay</a>
    </div>
  </div>
</div>
  `,
  styleUrls: ['../auth.scss']
})
export class LoginComponent {
  email = '';
  password = '';

  showPwd = signal(false);
  loading = signal(false);

  private readonly auth = inject(AuthService);
  private readonly chat = inject(ChatService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.toast.error('Vui lòng nhập email và mật khẩu');
      return;
    }

    this.loading.set(true);
    this.auth.login(this.email, this.password).subscribe({
      next: r => {
        this.chat.connect();
        const role = r.data.user.role;
        const dest = role === 'ADMIN' ? '/admin'
          : role === 'LANDLORD' ? '/landlord'
          : '/rooms';
        this.router.navigate([dest]);
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Đăng nhập thất bại');
        this.loading.set(false);
      }
    });
  }
}
