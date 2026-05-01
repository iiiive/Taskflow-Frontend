import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { Auth } from '../../services/auth/auth';
import { Router } from '@angular/router';


@Component({
  selector: 'app-login-form',
  imports: [FormsModule],
  templateUrl: './login-form.html',
  styleUrl: './login-form.scss',
})
export class LoginForm {
  email ='';
  password = '';
  message = '';

  constructor(
    private auth: Auth,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  Login(){
    this.message = '';
    const data = {
      email: this.email,
      password: this.password
    };
    this.auth.login(data).subscribe({
      next: (res:any) => {
        localStorage.setItem('token', res.token);
        this.message = "Login Successful!";
        this.router.navigate(['/dashboard']);
        this.cdr.detectChanges();
        
        console.log(res);
      },
      error: (err) => {
        this.message = err;
        this.cdr .detectChanges();
      }
    })
  }
    

  
}
