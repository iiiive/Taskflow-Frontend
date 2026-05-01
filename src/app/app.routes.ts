import { Routes } from '@angular/router';
import { Register } from './pages/register/register';
import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';  

export const routes: Routes = [
  { path: 'register', component: Register },
  { path: '', redirectTo: 'register', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'dashboard', component: Dashboard },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];