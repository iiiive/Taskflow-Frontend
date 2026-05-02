import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth/auth';
import { ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register-form',
  imports: [FormsModule],
  templateUrl: './register-form.html',
  styleUrl: './register-form.scss',
})
export class RegisterForm {
  name = '';
  email ='';
  password='';
  message='';

  constructor(
  private auth: Auth,
  private cdr: ChangeDetectorRef,
  private router: Router
  ){}

  Register(){
    this.message = '';
    const data = {
      name: this.name,
      email: this.email,
      password: this.password
    };
    this.auth.register(data).subscribe({
      next: (res:any) => {
        this.message = "Login Successful!";
        this.router.navigate(['/login']);
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
