import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../services/auth/auth';
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

  message = '';
  isSuccess = false;

  passwordMessage = '';
  passwordSuccess = false;

  constructor(
    private auth: Auth,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.message = '';
    this.passwordMessage = '';

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

      return `http://127.0.0.1:8000/storage/${this.user.avatar}`;
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
}