import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize, timeout } from 'rxjs';
import { Auth } from '../../services/auth/auth';

@Component({
  selector: 'app-register-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register-form.html',
  styleUrl: './register-form.scss',
})
export class RegisterForm {
  name = '';
  email = '';
  password = '';
  passwordConfirmation = '';

  toastMessage = '';
  toastType: 'success' | 'error' = 'error';
  loading = false;
  submitted = false;

  readonly maxNameLength = 80;
  readonly minPasswordLength = 8;

  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private auth: Auth,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  Register(): void {
    if (this.loading) {
      return;
    }

    this.submitted = true;
    this.toastMessage = '';

    const cleanedName = this.normalizeNameValue(this.name);
    const cleanedEmail = this.normalizeEmailValue(this.email);

    this.name = cleanedName;
    this.email = cleanedEmail;

    if (!cleanedName) {
      this.showToast('Full name is required.', 'error');
      return;
    }

    if (cleanedName.length > this.maxNameLength) {
      this.showToast(`Full name must not exceed ${this.maxNameLength} characters.`, 'error');
      return;
    }

    if (!cleanedEmail) {
      this.showToast('Email address is required.', 'error');
      return;
    }

    if (!this.isValidEmail(cleanedEmail)) {
      this.showToast('Please enter a valid email address.', 'error');
      return;
    }

    if (!this.password) {
      this.showToast('Password is required.', 'error');
      return;
    }

    if (this.password.length < this.minPasswordLength) {
      this.showToast(`Password must be at least ${this.minPasswordLength} characters.`, 'error');
      return;
    }

    if (!this.passwordConfirmation) {
      this.showToast('Please confirm your password.', 'error');
      return;
    }

    if (this.password !== this.passwordConfirmation) {
      this.showToast('Passwords do not match.', 'error');
      return;
    }

    this.loading = true;
    this.forceRefresh();

    const data = {
      name: cleanedName,
      email: cleanedEmail,
      password: this.password,
      password_confirmation: this.passwordConfirmation,
    };

    this.auth.register(data)
      .pipe(
        timeout(15000),
        finalize(() => {
          this.zone.run(() => {
            this.loading = false;
            this.forceRefresh();
          });
        })
      )
      .subscribe({
        next: () => {
          this.zone.run(() => {
            localStorage.removeItem('planora_token');
            localStorage.removeItem('token');
            sessionStorage.removeItem('planora_token');
            sessionStorage.removeItem('token');

            this.showToast('Account created successfully. You can now sign in.', 'success');

            setTimeout(() => {
              this.router.navigate(['/login'], { replaceUrl: true });
            }, 700);
          });
        },

        error: (err) => {
          this.zone.run(() => {
            if (err?.name === 'TimeoutError') {
              this.showToast('Registration request timed out. Please check if your Laravel backend is running.', 'error');
              return;
            }

            const backendErrors = err?.error?.errors;

            if (backendErrors?.email?.[0]) {
              this.showToast(backendErrors.email[0], 'error');
              return;
            }

            if (backendErrors?.name?.[0]) {
              this.showToast(backendErrors.name[0], 'error');
              return;
            }

            if (backendErrors?.password?.[0]) {
              this.showToast(backendErrors.password[0], 'error');
              return;
            }

            if (backendErrors) {
              const firstKey = Object.keys(backendErrors)[0];
              const firstMessage = backendErrors[firstKey]?.[0];

              this.showToast(firstMessage || 'Registration failed. Please check your details.', 'error');
              return;
            }

            if (err?.status === 422) {
              this.showToast('Registration failed. Please check your details.', 'error');
              return;
            }

            this.showToast(
              err?.error?.message ||
                err?.message ||
                'Registration failed. Please check if your backend API is running.',
              'error'
            );
          });
        },
      });
  }

  normalizeName(): void {
    this.name = this.normalizeNameValue(this.name);
  }

  normalizeEmail(): void {
    this.email = this.normalizeEmailValue(this.email);
  }

  clearToastOnEdit(): void {
    /*
     * Do not clear while loading.
     * This prevents the same delayed-error behavior from login.
     */
    if (this.loading) {
      return;
    }

    if (this.toastMessage && this.toastType === 'error') {
      this.toastMessage = '';
      this.forceRefresh();
    }
  }

  dismissToast(): void {
    this.toastMessage = '';

    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }

    this.forceRefresh();
  }

  loginWithGoogle(): void {
    window.location.href = this.auth.getGoogleRedirectUrl();
  }

  shouldShowNameRequired(): boolean {
    return this.submitted && !this.name.trim();
  }

  shouldShowNameMaxLength(): boolean {
    return this.submitted && this.name.trim().length > this.maxNameLength;
  }

  shouldShowEmailRequired(): boolean {
    return this.submitted && !this.email.trim();
  }

  shouldShowEmailInvalid(): boolean {
    return this.submitted && !!this.email.trim() && !this.isValidEmail(this.email.trim());
  }

  shouldShowPasswordRequired(): boolean {
    return this.submitted && !this.password;
  }

  shouldShowPasswordMinLength(): boolean {
    return this.submitted && !!this.password && this.password.length < this.minPasswordLength;
  }

  shouldShowConfirmPasswordRequired(): boolean {
    return this.submitted && !this.passwordConfirmation;
  }

  shouldShowPasswordMismatch(): boolean {
    return this.submitted && !!this.password && !!this.passwordConfirmation && this.password !== this.passwordConfirmation;
  }

  private normalizeNameValue(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private normalizeEmailValue(value: string): string {
    return value.trim().toLowerCase();
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;

    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    this.forceRefresh();

    if (type === 'error') {
      this.toastTimeout = setTimeout(() => {
        this.zone.run(() => {
          this.toastMessage = '';
          this.toastTimeout = null;
          this.forceRefresh();
        });
      }, 5000);
    }
  }

  private forceRefresh(): void {
    this.cdr.detectChanges();
  }
}