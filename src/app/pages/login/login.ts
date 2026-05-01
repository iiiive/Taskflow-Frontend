import { Component } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../services/auth/auth';
import { Router } from '@angular/router';
import { LoginForm } from '../../components/login-form/login-form';

@Component({
  selector: 'app-login',
  imports: [LoginForm],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {

}

