import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { ToastService } from '../../../core/services/toast.service';

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

    <form (ngSubmit)="onSubmit()">
      <div class="form-group">
        <label class="form-label">Họ và tên *</label>
        <input type="text" class="form-control" [(ngModel)]="fullName"
               name="fullName" required placeholder="Nguyễn Văn A" />
      </div>

      <div class="form-group">
        <label class="form-label">Email *</label>
        <input type="email" class="form-control" [ngModel]="email"
               (ngModelChange)="onEmailChange($event)" (blur)="checkEmailAvailability()"
               name="email" required placeholder="you@example.com" />
        <div class="auth-actions">
          <button type="button" class="btn btn-outline btn-block" [disabled]="sendingCode()"
                  (click)="sendVerificationCode()">
            @if (sendingCode()) { <span class="spinner"></span> Đang gửi mã... }
            @else { {{ codeSent() ? 'Gửi lại mã xác thực' : 'Gửi mã xác thực' }} }
          </button>
        </div>
        @if (emailHint()) {
          <div class="form-hint">{{ emailHint() }}</div>
        }
      </div>

      @if (codeSent()) {
        <div class="form-group">
          <label class="form-label">Mã xác thực email *</label>
          <input type="text" class="form-control" [(ngModel)]="verificationCode"
                 name="verificationCode" required maxlength="6" placeholder="Nhập 6 chữ số" />
          <div class="form-hint">Mã có hiệu lực trong 10 phút.</div>
          @if (verificationCodeError()) {
            <div class="form-error">{{ verificationCodeError() }}</div>
          }
        </div>
      }

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
            <div class="strength-bar">
              <div class="strength-fill" [class]="strengthClass()" [style.width.%]="strength()"></div>
            </div>
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
  verificationCode = '';

  role = signal<'SEEKER' | 'LANDLORD'>('SEEKER');
  showPwd = signal(false);
  loading = signal(false);
  sendingCode = signal(false);
  emailHint = signal('');
  codeSent = signal(false);
  emailExists = signal(false);
  verificationCodeError = signal('');

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
  private readonly toast = inject(ToastService);

  onEmailChange(value: string): void {
    this.email = value;
    this.emailHint.set('');
    this.emailExists.set(false);
    this.codeSent.set(false);
    this.verificationCode = '';
    this.verificationCodeError.set('');
  }

  checkEmailAvailability(): void {
    const email = this.email.trim();
    if (!email || !this.emailRegex.test(email)) return;

    this.auth.checkEmail(email).subscribe({
      next: ({ data }) => {
        this.emailExists.set(data.exists);
        this.emailHint.set(data.exists ? 'Email này đã được sử dụng.' : 'Email này hợp lệ.');
      },
      error: () => {
        this.emailHint.set('');
      }
    });
  }

  sendVerificationCode(): void {
    const email = this.email.trim();
    this.verificationCodeError.set('');

    if (!email) {
      this.toast.error('Vui lòng nhập email trước khi gửi mã xác thực');
      return;
    }
    if (!this.emailRegex.test(email)) {
      this.toast.error('Email không hợp lệ');
      return;
    }

    this.sendingCode.set(true);
    this.auth.sendRegistrationVerificationCode(email).subscribe({
      next: ({ message }) => {
        this.codeSent.set(true);
        this.emailExists.set(false);
        this.emailHint.set('Đã gửi mã xác thực tới email của bạn.');
        this.toast.success(message || 'Đã gửi mã xác thực tới email của bạn');
        this.sendingCode.set(false);
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không thể gửi mã xác thực');
        this.emailHint.set('');
        this.codeSent.set(false);
        this.sendingCode.set(false);
      }
    });
  }

  onSubmit(): void {
    if (!this.fullName.trim() || !this.email.trim() || !this.phone.trim() || !this.password) {
      this.toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (!this.emailRegex.test(this.email.trim())) {
      this.toast.error('Email không hợp lệ');
      return;
    }
    if (this.emailExists()) {
      this.toast.error('Email này đã được sử dụng');
      return;
    }
    if (!this.codeSent()) {
      this.toast.error('Vui lòng gửi mã xác thực email trước khi đăng ký');
      return;
    }
    if (!/^\d{6}$/.test(this.verificationCode.trim())) {
      this.verificationCodeError.set('Vui lòng nhập mã xác thực gồm 6 chữ số');
      return;
    }
    if (!this.phoneRegex.test(this.phone.trim())) {
      this.toast.error('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0');
      return;
    }
    if (this.password.length < 8) {
      this.toast.error('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    this.loading.set(true);
    this.verificationCodeError.set('');

    this.auth.register({
      email: this.email.trim(),
      password: this.password,
      fullName: this.fullName.trim(),
      phone: this.phone.trim(),
      role: this.role(),
      verificationCode: this.verificationCode.trim()
    }).subscribe({
      next: () => {
        this.toast.success('Đăng ký thành công');
        this.chat.connect();
        setTimeout(() => {
          void this.router.navigate([this.role() === 'LANDLORD' ? '/landlord' : '/rooms']);
        }, 1200);
      },
      error: e => {
        const message = e.error?.message ?? 'Đăng ký thất bại';
        const normalized = message.toLowerCase();
        if (normalized.includes('mã xác thực') || normalized.includes('yêu cầu mã')) {
          this.verificationCodeError.set(message);
        } else {
          this.toast.error(message);
        }
        this.loading.set(false);
      }
    });
  }
}
