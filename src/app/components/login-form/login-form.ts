import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth/auth';

@Component({
  selector: 'app-login-form',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login-form.html',
  styleUrl: './login-form.scss',
})
export class LoginForm {
  email = '';
  password = '';

  message = '';
  isSuccess = false;
  loading = false;

  constructor(
    private auth: Auth,
    private router: Router
  ) {}

  Login(): void {
    if (this.loading) {
      return;
    }

    this.message = '';
    this.isSuccess = false;
    this.loading = true;

    const data = {
      email: this.email.trim(),
      password: this.password
    };

    this.auth.login(data).subscribe({
      next: (res: any) => {
        const token = res?.token;

        if (token) {
          localStorage.setItem('token', token);
          localStorage.setItem('planora_token', token);
        }

        if (res?.user) {
          localStorage.setItem('planora_user', JSON.stringify(res.user));
        }

        this.message = 'Login successful. Redirecting to your dashboard...';
        this.isSuccess = true;
        this.loading = false;

        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.isSuccess = false;

        this.message =
          err?.error?.message ||
          err?.message ||
          'Login failed. Please check your email and password.';
      }
    });
  }
}