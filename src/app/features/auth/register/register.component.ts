import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';

@Component({
  selector: 'app-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink],
  template: `
<div class="auth-page">
  <div class="auth-card">
    <div class="auth-header">
      <div class="auth-logo">🏠</div>
      <h1>Tạo tài khoản</h1>
      <p>Tham gia PhòngTrọ.vn ngay hôm nay</p>
    </div>

    <div class="role-tabs">
      <button type="button" [class.active]="role() === 'SEEKER'" (click)="role.set('SEEKER')">🏠 Tìm phòng</button>
      <button type="button" [class.active]="role() === 'LANDLORD'" (click)="role.set('LANDLORD')">🏢 Cho thuê</button>
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
    @if (success()) { <div class="alert alert-success">{{ success() }}</div> }

    <form (ngSubmit)="onSubmit()">
      <div class="form-group">
        <label class="form-label">Họ và tên *</label>
        <input type="text" class="form-control" [(ngModel)]="fullName"
               name="fullName" required placeholder="Nguyễn Văn A" />
      </div>
      <div class="form-group">
        <label class="form-label">Email *</label>
        <input type="email" class="form-control" [(ngModel)]="email"
               name="email" required placeholder="you@example.com" />
      </div>
      <div class="form-group">
        <label class="form-label">Số điện thoại *</label>
        <input type="tel" class="form-control" [(ngModel)]="phone"
               name="phone" required placeholder="0912345678" />
      </div>
      <div class="form-group">
        <label class="form-label">Mật khẩu *</label>
        <div class="password-wrap">
          <input [type]="showPwd() ? 'text' : 'password'" class="form-control"
                 [(ngModel)]="password" name="password" required minlength="8"
                 placeholder="Ít nhất 8 ký tự" />
          <button type="button" class="pwd-toggle" (click)="showPwd.update(v => !v)">
            {{ showPwd() ? '🙈' : '👁️' }}
          </button>
        </div>
        @if (password) {
          <div class="strength-wrap">
            <div class="strength-bar"><div class="strength-fill" [class]="strengthClass()" [style.width.%]="strength()"></div></div>
            <span class="form-hint">Độ mạnh: {{ strengthLabel() }}</span>
          </div>
        }
      </div>

      <button type="submit" class="btn btn-primary btn-block btn-lg" [disabled]="loading()">
        @if (loading()) { <span class="spinner"></span> Đang đăng ký... }
        @else { Đăng ký }
      </button>
    </form>

    <div class="auth-footer">
      <span>Đã có tài khoản?</span>
      <a routerLink="/auth/login">Đăng nhập</a>
    </div>
  </div>
</div>
  `,
  styleUrls: ['../auth.scss']
})
export class RegisterComponent {
  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private readonly phoneRegex = /^0\d{9}$/;

  fullName = '';
  email = '';
  phone = '';
  password = '';

  role = signal<'SEEKER' | 'LANDLORD'>('SEEKER');
  showPwd = signal(false);
  loading = signal(false);
  error = signal('');
  success = signal('');

  strength = computed(() => {
    const p = this.password;
    let s = 0;
    if (p.length >= 8) s += 25;
    if (p.length >= 12) s += 25;
    if (/[A-Z]/.test(p)) s += 25;
    if (/[0-9!@#$%^&*]/.test(p)) s += 25;
    return s;
  });

  strengthClass = computed(() => {
    const s = this.strength();
    if (s <= 25) return 'weak';
    if (s <= 50) return 'fair';
    if (s <= 75) return 'good';
    return 'strong';
  });

  strengthLabel = computed(() => ({
    weak: 'Yếu',
    fair: 'Trung bình',
    good: 'Khá',
    strong: 'Mạnh'
  })[this.strengthClass()] ?? '');

  private readonly auth = inject(AuthService);
  private readonly chat = inject(ChatService);
  private readonly router = inject(Router);

  onSubmit(): void {
    if (!this.fullName.trim() || !this.email.trim() || !this.phone.trim() || !this.password) {
      this.error.set('Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (!this.emailRegex.test(this.email.trim())) {
      this.error.set('Email không hợp lệ');
      return;
    }
    if (!this.phoneRegex.test(this.phone.trim())) {
      this.error.set('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0');
      return;
    }
    if (this.password.length < 8) {
      this.error.set('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.auth.register({
      email: this.email.trim(),
      password: this.password,
      fullName: this.fullName.trim(),
      phone: this.phone.trim(),
      role: this.role()
    }).subscribe({
      next: () => {
        this.success.set('Đăng ký thành công! Đang chuyển hướng...');
        this.chat.connect();
        setTimeout(() => {
          this.router.navigate([this.role() === 'LANDLORD' ? '/landlord' : '/rooms']);
        }, 1200);
      },
      error: e => {
        this.error.set(e.error?.message ?? 'Đăng ký thất bại');
        this.loading.set(false);
      }
    });
  }
}
