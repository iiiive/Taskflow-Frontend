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

  twoFactorCode = '';
  twoFactorToken = '';
  requiresTwoFactorStep = false;

  message = '';
  isSuccess = false;
  loading = false;
  submitted = false;
  twoFactorSubmitted = false;

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
      const googleError = params.get('google_error') || params.get('error');

      const requires2fa = params.get('requires_2fa');
      const twoFactorToken = params.get('two_factor_token');

      if (googleError) {
        this.showMessage(decodeURIComponent(googleError), false);
        return;
      }

      // Google sign-in that needs 2FA is redirected back here with a challenge.
      if (requires2fa === '1' && twoFactorToken) {
        this.requiresTwoFactorStep = true;
        this.twoFactorToken = twoFactorToken;
        this.showMessage('Enter your Microsoft Authenticator code to continue.', true);
        this.forceRefresh();
        return;
      }
      // A successful Google sign-in sets the session cookie and redirects
      // straight to /dashboard — no token is passed through the URL.
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
            if (res?.requires_2fa && res?.two_factor_token) {
              this.requiresTwoFactorStep = true;
              this.twoFactorToken = res.two_factor_token;
              this.twoFactorCode = '';
              this.twoFactorSubmitted = false;
              this.password = '';

              this.showMessage('Password accepted. Enter your authenticator code to finish signing in.', true);
              this.forceRefresh();
              return;
            }

            this.finishLogin(res);
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

  verifyTwoFactorLogin(): void {
    if (this.loading) {
      return;
    }

    this.twoFactorSubmitted = true;
    this.message = '';
    this.isSuccess = false;

    const cleanedCode = this.cleanTwoFactorCode(this.twoFactorCode);

    if (!this.twoFactorToken) {
      this.showMessage('Your 2FA login session is missing. Please sign in again.', false);
      this.backToPasswordLogin();
      return;
    }

    if (!cleanedCode) {
      this.showMessage('Authenticator code is required.', false);
      return;
    }

    if (!/^\d{6}$/.test(cleanedCode)) {
      this.showMessage('Authenticator code must be 6 digits.', false);
      return;
    }

    this.loading = true;
    this.forceRefresh();

    this.auth.verifyTwoFactorLogin({
      two_factor_token: this.twoFactorToken,
      code: cleanedCode
    })
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
            this.finishLogin(res);
          });
        },
        error: (err) => {
          this.zone.run(() => {
            if (err?.name === 'TimeoutError') {
              this.showMessage('2FA verification timed out. Please try again.', false);
              return;
            }

            const validationErrors = err?.error?.errors;

            if (validationErrors?.code?.[0]) {
              this.showMessage(validationErrors.code[0], false);
              return;
            }

            this.showMessage(
              err?.error?.message ||
                'Invalid authenticator code. Please check Microsoft Authenticator and try again.',
              false
            );
          });
        }
      });
  }

  backToPasswordLogin(): void {
    this.requiresTwoFactorStep = false;
    this.twoFactorToken = '';
    this.twoFactorCode = '';
    this.twoFactorSubmitted = false;
    this.submitted = false;
    this.password = '';
    this.message = '';
    this.isSuccess = false;
    this.forceRefresh();
  }

  normalizeEmail(): void {
    this.email = this.normalizeEmailValue(this.email);
  }

  clearMessageOnEdit(): void {
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

  shouldShowTwoFactorCodeRequired(): boolean {
    return this.twoFactorSubmitted && !this.cleanTwoFactorCode(this.twoFactorCode);
  }

  shouldShowTwoFactorCodeInvalid(): boolean {
    const cleanedCode = this.cleanTwoFactorCode(this.twoFactorCode);

    return this.twoFactorSubmitted && !!cleanedCode && !/^\d{6}$/.test(cleanedCode);
  }

  onTwoFactorInput(): void {
    this.twoFactorCode = this.cleanTwoFactorCode(this.twoFactorCode).slice(0, 6);
    this.clearMessageOnEdit();
  }

  private finishLogin(res: any): void {
    // No token is stored — auth is the httpOnly session cookie. We keep only the
    // (non-secret) user profile for UI/guards.
    if (res?.user) {
      localStorage.setItem('planora_user', JSON.stringify(res.user));
    }

    this.requiresTwoFactorStep = false;
    this.twoFactorToken = '';
    this.twoFactorCode = '';

    const isSuperAdmin = res?.user?.is_super_admin === true;
    const isOrgAdmin = res?.user?.is_org_admin === true;

    const target = isSuperAdmin ? '/admin' : isOrgAdmin ? '/org' : '/dashboard';
    const destinationLabel = isSuperAdmin
      ? 'admin panel'
      : isOrgAdmin
        ? 'organization console'
        : 'your dashboard';

    this.showMessage(`Login successful. Redirecting to ${destinationLabel}...`, true);

    this.router.navigate([target], { replaceUrl: true });
  }

  private normalizeEmailValue(value: string): string {
    return value.trim().toLowerCase();
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  }

  private cleanTwoFactorCode(value: string): string {
    return String(value || '').replace(/\D/g, '');
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