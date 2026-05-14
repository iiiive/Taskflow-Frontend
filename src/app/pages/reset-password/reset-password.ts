import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth/auth';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss'
})
export class ResetPassword implements OnInit {
  email = '';
  code = '';
  password = '';
  passwordConfirmation = '';

  loading = false;
  message = '';
  isSuccess = false;

  constructor(
    private auth: Auth,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const emailFromQuery = params.get('email');

      if (emailFromQuery) {
        this.email = emailFromQuery;
      }
    });
  }

  resetPassword(): void {
    if (this.loading) {
      return;
    }

    this.message = '';
    this.isSuccess = false;

    if (!this.email.trim()) {
      this.message = 'Email address is required.';
      return;
    }

    if (this.code.trim().length !== 6) {
      this.message = 'Reset code must be 6 digits.';
      return;
    }

    if (this.password.length < 8) {
      this.message = 'New password must be at least 8 characters.';
      return;
    }

    if (this.password !== this.passwordConfirmation) {
      this.message = 'Passwords do not match.';
      return;
    }

    this.loading = true;

    this.auth.resetPassword({
      email: this.email.trim(),
      code: this.code.trim(),
      password: this.password,
      password_confirmation: this.passwordConfirmation
    }).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.isSuccess = true;
        this.message = res?.message || 'Password reset successfully.';

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1000);
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
          'Unable to reset password. Please check your code and try again.';
      }
    });
  }
}