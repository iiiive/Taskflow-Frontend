import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
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

  readonly maxNameLength = 80;

  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private auth: Auth,
    private router: Router
  ) {}

  Register(): void {
    if (this.loading) {
      return;
    }

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

    if (this.password.length < 8) {
      this.showToast('Password must be at least 8 characters.', 'error');
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
          this.loading = false;
        })
      )
      .subscribe({
        next: () => {
          localStorage.removeItem('planora_token');
          localStorage.removeItem('token');
          sessionStorage.removeItem('planora_token');
          sessionStorage.removeItem('token');

          this.showToast('Account created successfully. You can now sign in.', 'success');

          setTimeout(() => {
            this.router.navigate(['/login'], { replaceUrl: true });
          }, 700);
        },

        error: (err) => {
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

          this.showToast(
            err?.error?.message ||
              err?.message ||
              'Registration failed. Please check if your backend API is running.',
            'error'
          );
        },
      });
  }

  normalizeName(): void {
    this.name = this.normalizeNameValue(this.name);
  }

  normalizeEmail(): void {
    this.email = this.normalizeEmailValue(this.email);
  }

  dismissToast(): void {
    this.toastMessage = '';

    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }
  }

  loginWithGoogle(): void {
    window.location.href = this.auth.getGoogleRedirectUrl();
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

    this.toastTimeout = setTimeout(() => {
      this.toastMessage = '';
      this.toastTimeout = null;
    }, 4500);
  }
}