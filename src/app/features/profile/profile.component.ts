import {
  Component, ChangeDetectionStrategy, OnInit,
  signal, inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService, ProfileStats } from '../../core/services/profile.service';
import { User } from '../../core/models';

@Component({
  selector: 'app-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DatePipe],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly phoneRegex = /^0\d{9}$/;
  readonly auth = inject(AuthService);

  activeTab = signal<'info' | 'password' | 'stats'>('info');

  profile = signal<User | null>(null);
  fullName = '';
  phone = '';
  saving = signal(false);
  infoMsg = signal('');
  infoError = signal('');

  currentPwd = '';
  newPwd = '';
  confirmPwd = '';
  showCurrent = signal(false);
  showNew = signal(false);
  pwdSaving = signal(false);
  pwdMsg = signal('');
  pwdError = signal('');

  avatarPreview = signal<string | null>(null);
  avatarFile: File | null = null;
  avatarUploading = signal(false);

  stats = signal<ProfileStats | null>(null);

  ngOnInit(): void {
    this.profileService.getProfile().subscribe(r => {
      this.profile.set(r.data);
      this.fullName = r.data.fullName;
      this.phone = r.data.phone ?? '';
    });

    this.profileService.getStats().subscribe(r => this.stats.set(r.data));
  }

  saveProfile(): void {
    if (!this.fullName.trim()) {
      this.infoError.set('Họ tên không được để trống');
      return;
    }
    if (this.phone.trim() && !this.phoneRegex.test(this.phone.trim())) {
      this.infoError.set('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0');
      return;
    }

    this.saving.set(true);
    this.infoError.set('');
    this.profileService.updateProfile({ fullName: this.fullName.trim(), phone: this.phone.trim() }).subscribe({
      next: r => {
        this.profile.set(r.data);
        this.auth.updateUser(r.data);
        this.infoMsg.set('Cập nhật thành công!');
        this.saving.set(false);
        setTimeout(() => this.infoMsg.set(''), 3000);
      },
      error: e => {
        this.infoError.set(e.error?.message ?? 'Lỗi cập nhật');
        this.saving.set(false);
      }
    });
  }

  changePassword(): void {
    this.pwdError.set('');

    if (!this.currentPwd || !this.newPwd) {
      this.pwdError.set('Vui lòng điền đầy đủ');
      return;
    }
    if (this.newPwd.length < 8) {
      this.pwdError.set('Mật khẩu mới ít nhất 8 ký tự');
      return;
    }
    if (this.newPwd !== this.confirmPwd) {
      this.pwdError.set('Xác nhận mật khẩu không khớp');
      return;
    }

    this.pwdSaving.set(true);
    this.profileService.changePassword({
      currentPassword: this.currentPwd,
      newPassword: this.newPwd
    }).subscribe({
      next: () => {
        this.pwdMsg.set('Đổi mật khẩu thành công!');
        this.currentPwd = '';
        this.newPwd = '';
        this.confirmPwd = '';
        this.pwdSaving.set(false);
        setTimeout(() => this.pwdMsg.set(''), 3000);
      },
      error: e => {
        this.pwdError.set(e.error?.message ?? 'Sai mật khẩu hiện tại');
        this.pwdSaving.set(false);
      }
    });
  }

  onAvatarSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.[0]) return;

    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      alert('Ảnh tối đa 5MB');
      return;
    }

    this.avatarFile = file;
    const reader = new FileReader();
    reader.onload = e => this.avatarPreview.set(e.target!.result as string);
    reader.readAsDataURL(file);
  }

  uploadAvatar(): void {
    if (!this.avatarFile) return;

    this.avatarUploading.set(true);
    this.profileService.uploadAvatar(this.avatarFile).subscribe({
      next: r => {
        const updated = { ...this.profile()!, avatarUrl: r.data };
        this.profile.set(updated);
        this.auth.updateUser(updated);
        this.avatarFile = null;
        this.avatarUploading.set(false);
        this.infoMsg.set('Cập nhật ảnh đại diện thành công!');
        setTimeout(() => this.infoMsg.set(''), 3000);
      },
      error: () => this.avatarUploading.set(false)
    });
  }

  roleLabel(): string {
    const map: Record<string, string> = {
      ADMIN: 'Quản trị viên',
      LANDLORD: 'Chủ nhà',
      SEEKER: 'Người thuê'
    };
    return map[this.profile()?.role ?? ''] ?? '';
  }

  isLandlordView(): boolean {
    return this.profile()?.role === 'LANDLORD';
  }
}
