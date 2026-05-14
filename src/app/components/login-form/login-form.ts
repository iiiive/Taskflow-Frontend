import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { Auth } from '../../services/auth/auth';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login-form.html',
  styleUrl: './login-form.scss',
})
export class LoginForm implements OnInit {
  email = '';
  password = '';

  message = '';
  isSuccess = false;
  loading = false;
  submitted = false;

  readonly minPasswordLength = 8;

  private messageTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private auth: Auth,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const googleToken = params.get('google_token') || params.get('token');
      const googleError = params.get('google_error') || params.get('error');

      if (googleError) {
        this.showMessage(decodeURIComponent(googleError), false);
        return;
      }

      if (googleToken) {
        localStorage.setItem('token', googleToken);
        localStorage.setItem('planora_token', googleToken);

        this.showMessage('Google sign in successful. Redirecting to your dashboard...', true);

        this.router.navigate(['/dashboard'], { replaceUrl: true });
      }
    });
  }

  Login(): void {
    if (this.loading) {
      return;
    }

    this.submitted = true;
    this.message = '';
    this.isSuccess = false;

    const cleanedEmail = this.normalizeEmailValue(this.email);
    this.email = cleanedEmail;

    if (!cleanedEmail) {
      this.showMessage('Email address is required.', false);
      return;
    }

    if (!this.isValidEmail(cleanedEmail)) {
      this.showMessage('Please enter a valid email address.', false);
      return;
    }

    if (!this.password) {
      this.showMessage('Password is required.', false);
      return;
    }

    if (this.password.length < this.minPasswordLength) {
      this.showMessage(`Password must be at least ${this.minPasswordLength} characters.`, false);
      return;
    }

    this.loading = true;
    this.forceRefresh();

    const data = {
      email: cleanedEmail,
      password: this.password,
    };

    this.auth.login(data)
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
        next: (res: any) => {
          this.zone.run(() => {
            const token = res?.token;

            if (token) {
              localStorage.setItem('token', token);
              localStorage.setItem('planora_token', token);
            }

            if (res?.user) {
              localStorage.setItem('planora_user', JSON.stringify(res.user));
            }

            this.showMessage('Login successful. Redirecting to your dashboard...', true);

            this.router.navigate(['/dashboard'], { replaceUrl: true });
          });
        },

        error: (err) => {
          this.zone.run(() => {
            if (err?.name === 'TimeoutError') {
              this.showMessage('Login request timed out. Please check if your Laravel backend is running.', false);
              return;
            }

            const validationErrors = err?.error?.errors;

            if (validationErrors?.email?.[0]) {
              this.showMessage(validationErrors.email[0], false);
              return;
            }

            if (validationErrors?.password?.[0]) {
              this.showMessage(validationErrors.password[0], false);
              return;
            }

            if (err?.status === 401 || err?.status === 422) {
              this.showMessage('Invalid email or password. Please check your credentials.', false);
              return;
            }

            this.showMessage(
              err?.error?.message ||
                err?.message ||
                'Login failed. Please check your email and password.',
              false
            );
          });
        },
      });
  }

  normalizeEmail(): void {
    this.email = this.normalizeEmailValue(this.email);
  }

  clearMessageOnEdit(): void {
    /*
     * Do not clear the message while loading.
     * This prevents the delayed-error behavior where clicking the input
     * affects when the message becomes visible.
     */
    if (this.loading) {
      return;
    }

    if (this.message && !this.isSuccess) {
      this.message = '';
      this.forceRefresh();
    }
  }

  dismissMessage(): void {
    this.message = '';

    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
      this.messageTimeout = null;
    }

    this.forceRefresh();
  }

  loginWithGoogle(): void {
    window.location.href = this.auth.getGoogleRedirectUrl();
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

  private normalizeEmailValue(value: string): string {
    return value.trim().toLowerCase();
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  }

  private showMessage(message: string, success: boolean): void {
    this.message = message;
    this.isSuccess = success;

    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }

    this.forceRefresh();

    if (!success) {
      this.messageTimeout = setTimeout(() => {
        this.zone.run(() => {
          this.message = '';
          this.messageTimeout = null;
          this.forceRefresh();
        });
      }, 5000);
    }
  }

  private forceRefresh(): void {
    this.cdr.detectChanges();
  }
}