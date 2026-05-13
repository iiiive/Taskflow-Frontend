import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth/auth';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register-form',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register-form.html',
  styleUrl: './register-form.scss',
})
export class RegisterForm {
  name = '';
  email = '';
  password = '';

  message = '';
  isSuccess = false;
  loading = false;

  constructor(
    private auth: Auth,
    private router: Router
  ) {}

  Register(): void {
    if (this.loading) {
      return;
    }

    this.message = '';
    this.isSuccess = false;
    this.loading = true;

    const data = {
      name: this.name.trim(),
      email: this.email.trim(),
      password: this.password
    };

    this.auth.register(data).subscribe({
      next: () => {
        this.message = 'Account created successfully. You can now sign in.';
        this.isSuccess = true;
        this.loading = false;

        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading = false;
        this.isSuccess = false;

        this.message =
          err?.error?.message ||
          err?.message ||
          'Registration failed. Please check your details.';
      }
    });
  }
}