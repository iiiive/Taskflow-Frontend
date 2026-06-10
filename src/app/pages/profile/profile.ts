import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Auth } from '../../services/auth/auth';
import { environment } from '../../../environments/environment';
import { AppSidebar } from '../../components/app-sidebar/app-sidebar';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebar],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class Profile implements OnInit {
  user: any = null;

  name = '';
  email = '';

  currentPassword = '';
  newPassword = '';
  newPasswordConfirmation = '';

  selectedAvatarFile: File | null = null;
  selectedAvatarPreview: string | null = null;

  loading = true;
  savingProfile = false;
  savingPassword = false;
  uploadingAvatar = false;
  removingAvatar = false;

  settingUpTwoFactor = false;
  confirmingTwoFactor = false;
  disablingTwoFactor = false;
  regeneratingRecoveryCodes = false;

  twoFactorQrCode: SafeHtml | null = null;
  manualSetupKey = '';
  twoFactorCode = '';
  disableTwoFactorPassword = '';
  recoveryCodes: string[] = [];

  twoFactorMessage = '';
  twoFactorSuccess = false;

  message = '';
  isSuccess = false;

  passwordMessage = '';
  passwordSuccess = false;

  constructor(
    private auth: Auth,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.message = '';
    this.passwordMessage = '';
    this.twoFactorMessage = '';

    this.auth.getProfile().subscribe({
      next: (res: any) => {
        this.user = res?.user || res?.data || res;

        this.name = this.user?.name || '';
        this.email = this.user?.email || '';

        localStorage.setItem('planora_user', JSON.stringify(this.user));

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Load profile error:', err);

        this.loading = false;
        this.isSuccess = false;
        this.message = err?.error?.message || 'Unable to load profile.';
        this.cdr.detectChanges();
      }
    });
  }

  startTwoFactorSetup(): void {
    if (this.settingUpTwoFactor) {
      return;
    }

    this.settingUpTwoFactor = true;
    this.twoFactorMessage = '';
    this.twoFactorSuccess = false;
    this.recoveryCodes = [];
    this.twoFactorQrCode = null;
    this.manualSetupKey = '';
    this.twoFactorCode = '';

    this.auth.setupTwoFactor().subscribe({
      next: (res: any) => {
        this.settingUpTwoFactor = false;

        const qrSvg = res?.qr_code_svg || '';

        this.twoFactorQrCode = qrSvg
          ? this.sanitizer.bypassSecurityTrustHtml(qrSvg)
          : null;

        this.manualSetupKey = res?.manual_setup_key || '';
        this.twoFactorSuccess = true;
        this.twoFactorMessage = res?.message || 'Scan the QR code and enter the 6-digit code to confirm.';

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('2FA setup error:', err);

        this.settingUpTwoFactor = false;
        this.twoFactorSuccess = false;
        this.twoFactorMessage = err?.error?.message || 'Unable to start 2FA setup.';
        this.cdr.detectChanges();
      }
    });
  }

  confirmTwoFactor(): void {
    if (this.confirmingTwoFactor) {
      return;
    }

    const cleanedCode = this.cleanTwoFactorCode(this.twoFactorCode);

    this.twoFactorMessage = '';
    this.twoFactorSuccess = false;

    if (!cleanedCode) {
      this.twoFactorMessage = 'Authenticator code is required.';
      return;
    }

    if (!/^\d{6}$/.test(cleanedCode)) {
      this.twoFactorMessage = 'Authenticator code must be 6 digits.';
      return;
    }

    this.confirmingTwoFactor = true;

    this.auth.confirmTwoFactor({ code: cleanedCode }).subscribe({
      next: (res: any) => {
        this.confirmingTwoFactor = false;

        this.user = res?.user || this.user;
        localStorage.setItem('planora_user', JSON.stringify(this.user));

        this.recoveryCodes = Array.isArray(res?.recovery_codes)
          ? res.recovery_codes
          : [];

        this.twoFactorQrCode = null;
        this.manualSetupKey = '';
        this.twoFactorCode = '';

        this.twoFactorSuccess = true;
        this.twoFactorMessage = res?.message || 'Two-factor authentication has been enabled.';

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('2FA confirm error:', err);

        this.confirmingTwoFactor = false;
        this.twoFactorSuccess = false;

        const validationErrors = err?.error?.errors;

        if (validationErrors?.code?.[0]) {
          this.twoFactorMessage = validationErrors.code[0];
        } else {
          this.twoFactorMessage = err?.error?.message || 'Invalid authenticator code.';
        }

        this.cdr.detectChanges();
      }
    });
  }

  disableTwoFactor(): void {
    if (this.disablingTwoFactor) {
      return;
    }

    this.twoFactorMessage = '';
    this.twoFactorSuccess = false;

    if (!this.disableTwoFactorPassword.trim()) {
      this.twoFactorMessage = 'Enter your password to disable 2FA.';
      return;
    }

    const confirmed = confirm('Disable two-factor authentication for this account?');

    if (!confirmed) {
      return;
    }

    this.disablingTwoFactor = true;

    this.auth.disableTwoFactor({
      password: this.disableTwoFactorPassword
    }).subscribe({
      next: (res: any) => {
        this.disablingTwoFactor = false;

        this.user = res?.user || this.user;
        localStorage.setItem('planora_user', JSON.stringify(this.user));

        this.disableTwoFactorPassword = '';
        this.twoFactorQrCode = null;
        this.manualSetupKey = '';
        this.recoveryCodes = [];

        this.twoFactorSuccess = true;
        this.twoFactorMessage = res?.message || 'Two-factor authentication has been disabled.';

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('2FA disable error:', err);

        this.disablingTwoFactor = false;
        this.twoFactorSuccess = false;

        const validationErrors = err?.error?.errors;

        if (validationErrors) {
          const firstKey = Object.keys(validationErrors)[0];
          this.twoFactorMessage = validationErrors[firstKey][0];
        } else {
          this.twoFactorMessage = err?.error?.message || 'Unable to disable 2FA.';
        }

        this.cdr.detectChanges();
      }
    });
  }

  regenerateRecoveryCodes(): void {
    if (this.regeneratingRecoveryCodes) {
      return;
    }

    const confirmed = confirm('Generate new recovery codes? Your old recovery codes should no longer be used after this.');

    if (!confirmed) {
      return;
    }

    this.regeneratingRecoveryCodes = true;
    this.twoFactorMessage = '';
    this.twoFactorSuccess = false;

    this.auth.regenerateRecoveryCodes().subscribe({
      next: (res: any) => {
        this.regeneratingRecoveryCodes = false;

        this.recoveryCodes = Array.isArray(res?.recovery_codes)
          ? res.recovery_codes
          : [];

        this.twoFactorSuccess = true;
        this.twoFactorMessage = res?.message || 'Recovery codes regenerated successfully.';

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Recovery codes error:', err);

        this.regeneratingRecoveryCodes = false;
        this.twoFactorSuccess = false;
        this.twoFactorMessage = err?.error?.message || 'Unable to regenerate recovery codes.';

        this.cdr.detectChanges();
      }
    });
  }

  onTwoFactorCodeInput(): void {
    this.twoFactorCode = this.cleanTwoFactorCode(this.twoFactorCode).slice(0, 6);
  }

  isTwoFactorEnabled(): boolean {
    return this.user?.two_factor_enabled === true || this.user?.two_factor_enabled === 1;
  }

  updateProfile(): void {
    if (this.savingProfile) {
      return;
    }

    this.message = '';
    this.isSuccess = false;

    if (!this.name.trim()) {
      this.message = 'Name is required.';
      return;
    }

    if (!this.email.trim()) {
      this.message = 'Email is required.';
      return;
    }

    this.savingProfile = true;

    this.auth.updateProfile({
      name: this.name.trim(),
      email: this.email.trim()
    }).subscribe({
      next: (res: any) => {
        this.user = res?.user || res?.data || res;

        localStorage.setItem('planora_user', JSON.stringify(this.user));

        this.name = this.user?.name || '';
        this.email = this.user?.email || '';

        this.savingProfile = false;
        this.isSuccess = true;
        this.message = 'Profile updated successfully.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Update profile error:', err);

        this.savingProfile = false;
        this.isSuccess = false;

        const validationErrors = err?.error?.errors;

        if (validationErrors) {
          const firstKey = Object.keys(validationErrors)[0];
          this.message = validationErrors[firstKey][0];
        } else {
          this.message = err?.error?.message || 'Unable to update profile.';
        }

        this.cdr.detectChanges();
      }
    });
  }

  updatePassword(): void {
    if (this.savingPassword) {
      return;
    }

    this.passwordMessage = '';
    this.passwordSuccess = false;

    if (this.userHasPassword() && !this.currentPassword.trim()) {
      this.passwordMessage = 'Current password is required.';
      return;
    }

    if (this.newPassword.length < 8) {
      this.passwordMessage = 'New password must be at least 8 characters.';
      return;
    }

    if (this.newPassword !== this.newPasswordConfirmation) {
      this.passwordMessage = 'New passwords do not match.';
      return;
    }

    const payload: any = {
      password: this.newPassword,
      password_confirmation: this.newPasswordConfirmation
    };

    if (this.userHasPassword()) {
      payload.current_password = this.currentPassword;
    }

    this.savingPassword = true;

    this.auth.updatePassword(payload).subscribe({
      next: (res: any) => {
        this.user = res?.user || res?.data || this.user;

        localStorage.setItem('planora_user', JSON.stringify(this.user));

        this.currentPassword = '';
        this.newPassword = '';
        this.newPasswordConfirmation = '';

        this.savingPassword = false;
        this.passwordSuccess = true;
        this.passwordMessage = 'Password updated successfully.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Update password error:', err);

        this.savingPassword = false;
        this.passwordSuccess = false;

        const validationErrors = err?.error?.errors;

        if (validationErrors) {
          const firstKey = Object.keys(validationErrors)[0];
          this.passwordMessage = validationErrors[firstKey][0];
        } else {
          this.passwordMessage = err?.error?.message || 'Unable to update password.';
        }

        this.cdr.detectChanges();
      }
    });
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    this.message = '';
    this.isSuccess = false;

    if (!file) {
      this.selectedAvatarFile = null;
      this.selectedAvatarPreview = null;
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      this.message = 'Please upload a JPG, PNG, or WEBP image.';
      this.selectedAvatarFile = null;
      this.selectedAvatarPreview = null;
      input.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.message = 'Profile picture must not exceed 2MB.';
      this.selectedAvatarFile = null;
      this.selectedAvatarPreview = null;
      input.value = '';
      return;
    }

    this.selectedAvatarFile = file;

    const reader = new FileReader();

    reader.onload = () => {
      this.selectedAvatarPreview = reader.result as string;
      this.cdr.detectChanges();
    };

    reader.readAsDataURL(file);
  }

  uploadAvatar(): void {
    if (!this.selectedAvatarFile || this.uploadingAvatar) {
      return;
    }

    const formData = new FormData();
    formData.append('avatar', this.selectedAvatarFile);

    this.uploadingAvatar = true;
    this.message = '';
    this.isSuccess = false;

    this.auth.updateAvatar(formData).subscribe({
      next: (res: any) => {
        this.user = res?.user || res?.data || res;

        localStorage.setItem('planora_user', JSON.stringify(this.user));

        this.selectedAvatarFile = null;
        this.selectedAvatarPreview = null;

        this.uploadingAvatar = false;
        this.isSuccess = true;
        this.message = 'Profile picture updated successfully.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Upload avatar error:', err);

        this.uploadingAvatar = false;
        this.isSuccess = false;

        const validationErrors = err?.error?.errors;

        if (validationErrors) {
          const firstKey = Object.keys(validationErrors)[0];
          this.message = validationErrors[firstKey][0];
        } else {
          this.message = err?.error?.message || 'Unable to upload profile picture.';
        }

        this.cdr.detectChanges();
      }
    });
  }

  removeAvatar(): void {
    if (this.removingAvatar) {
      return;
    }

    const confirmed = confirm('Remove your profile picture?');

    if (!confirmed) {
      return;
    }

    this.removingAvatar = true;
    this.message = '';
    this.isSuccess = false;

    this.auth.removeAvatar().subscribe({
      next: (res: any) => {
        this.user = res?.user || res?.data || res;

        localStorage.setItem('planora_user', JSON.stringify(this.user));

        this.selectedAvatarFile = null;
        this.selectedAvatarPreview = null;

        this.removingAvatar = false;
        this.isSuccess = true;
        this.message = 'Profile picture removed successfully.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Remove avatar error:', err);

        this.removingAvatar = false;
        this.isSuccess = false;
        this.message = err?.error?.message || 'Unable to remove profile picture.';
        this.cdr.detectChanges();
      }
    });
  }

  getAvatarDisplay(): string | null {
    if (this.selectedAvatarPreview) {
      return this.selectedAvatarPreview;
    }

    if (this.user?.avatar_url) {
      return this.user.avatar_url;
    }

    if (this.user?.avatar) {
      if (
        this.user.avatar.startsWith('http://') ||
        this.user.avatar.startsWith('https://')
      ) {
        return this.user.avatar;
      }

      return `${environment.storageUrl}/${this.user.avatar}`;
    }

    return null;
  }

  getUserInitial(): string {
    return this.user?.name ? this.user.name.charAt(0).toUpperCase() : 'U';
  }

  getAccountType(): string {
    return this.user?.google_id ? 'Google Account' : 'Email and Password';
  }

  userHasPassword(): boolean {
    return !this.user?.google_id || this.user?.has_password === true;
  }

  private cleanTwoFactorCode(value: string): string {
    return String(value || '').replace(/\D/g, '');
  }
}