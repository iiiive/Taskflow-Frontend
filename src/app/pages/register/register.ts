import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../services/auth/auth';
import { ChangeDetectorRef } from '@angular/core';
import { RegisterForm } from '../../components/register-form/register-form';


@Component({
  selector: 'app-register',
  imports: [RegisterForm],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  message = 'im a picture';
}
