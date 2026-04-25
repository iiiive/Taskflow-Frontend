import { Component } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../services/auth/auth';


@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  email = '';
  password = '';
  message = '';

constructor(private auth: Auth, private cdr: ChangeDetectorRef) {}
  Login() {
    this.message = '';
    const data = {
      email: this.email,
      password: this.password
    }
    this.auth.login(data).subscribe({
      next: (res:any) => {
        localStorage.setItem('token', res.token);
        this.message = res.message;
        this.cdr.detectChanges();
        console.log(res);
      },
      error: (err) => {
        console.error(err);

        if (err.status === 422) {
          this.message = err.error.message;
        } else {
          this.message = 'An error occurred. Please try again.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  getProfile() {
    this.auth.getProfile().subscribe({
      next: (res:any) => {
        console.log(res);
        
        this.message = res.message;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.message = err.error.message || 'An error occurred. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  
}

