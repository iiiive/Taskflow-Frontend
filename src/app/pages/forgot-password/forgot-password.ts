import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth/auth';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss'
})
export class ForgotPassword {
  email = '';

  loading = false;
  message = '';
  isSuccess = false;

  constructor(
    private auth: Auth,
    private router: Router
  ) {}

  sendResetCode(): void {
    if (this.loading) {
      return;
    }

    if (!this.email.trim()) {
      this.message = 'Email address is required.';
      this.isSuccess = false;
      return;
    }

    this.loading = true;
    this.message = '';
    this.isSuccess = false;

    this.auth.forgotPassword({
      email: this.email.trim()
    }).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.isSuccess = true;
        this.message = res?.message || 'Reset code sent.';

        this.router.navigate(['/reset-password'], {
          queryParams: {
            email: this.email.trim()
          }
        });
      },
      error: (err) => {
        this.loading = false;
        this.isSuccess = false;

        const validationErrors = err?.error?.errors;

        if (validationErrors) {
          const firstKey = Object.keys(validationErrors)[0];
          this.message = validationErrors[firstKey][0];
          return;
        }

        this.message =
          err?.error?.message ||
          'Unable to send reset code. Please try again.';
      }
    });
  }
}