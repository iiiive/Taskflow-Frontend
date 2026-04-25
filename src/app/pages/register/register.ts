import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../services/auth/auth';
import { ChangeDetectorRef } from '@angular/core';


@Component({
  selector: 'app-register',
  imports: [FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  name = '';
  email = '';
  password = '';
  message = '';

constructor(private auth: Auth, private cdr: ChangeDetectorRef) {}
  register() {
    this.message = '';
    const data = {
      name: this.name,
      email: this.email,
      password: this.password
    };

    this.auth.register(data).subscribe({
      next: (res:any) => {
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
}
