import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService, ProfileStats } from '../../core/services/profile.service';
import { ToastService } from '../../core/services/toast.service';
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
  private readonly toast = inject(ToastService);

  activeTab = signal<'info' | 'password' | 'stats'>('info');

  profile = signal<User | null>(null);
  fullName = '';
  phone = '';
  saving = signal(false);

  currentPwd = '';
  newPwd = '';
  confirmPwd = '';
  showCurrent = signal(false);
  showNew = signal(false);
  pwdSaving = signal(false);

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
      this.toast.error('Họ tên không được để trống');
      return;
    }
    if (this.phone.trim() && !this.phoneRegex.test(this.phone.trim())) {
      this.toast.error('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0');
      return;
    }

    this.saving.set(true);
    this.profileService.updateProfile({ fullName: this.fullName.trim(), phone: this.phone.trim() }).subscribe({
      next: r => {
        this.profile.set(r.data);
        this.auth.updateUser(r.data);
        this.toast.success('Cập nhật thành công');
        this.saving.set(false);
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Lỗi cập nhật');
        this.saving.set(false);
      }
    });
  }

  changePassword(): void {
    if (!this.currentPwd || !this.newPwd) {
      this.toast.error('Vui lòng điền đầy đủ');
      return;
    }
    if (this.newPwd.length < 8) {
      this.toast.error('Mật khẩu mới ít nhất 8 ký tự');
      return;
    }
    if (this.newPwd !== this.confirmPwd) {
      this.toast.error('Xác nhận mật khẩu không khớp');
      return;
    }

    this.pwdSaving.set(true);
    this.profileService.changePassword({
      currentPassword: this.currentPwd,
      newPassword: this.newPwd
    }).subscribe({
      next: () => {
        this.toast.success('Đổi mật khẩu thành công');
        this.currentPwd = '';
        this.newPwd = '';
        this.confirmPwd = '';
        this.pwdSaving.set(false);
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Sai mật khẩu hiện tại');
        this.pwdSaving.set(false);
      }
    });
  }

  onAvatarSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.[0]) return;

    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      this.toast.error('Ảnh tối đa 5MB');
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
        this.toast.success('Cập nhật ảnh đại diện thành công');
      },
      error: e => {
        this.toast.error(e.error?.message ?? 'Không thể tải ảnh đại diện');
        this.avatarUploading.set(false);
      }
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
