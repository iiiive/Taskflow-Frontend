import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './app-sidebar.html',
  styleUrl: './app-sidebar.scss'
})
export class AppSidebar implements OnInit {
  @Input() activePage:
    | 'dashboard'
    | 'workspaces'
    | 'backlog'
    | 'board'
    | 'activity'
    | '' = '';

  @Input() workspaceId: number | null = null;

  apiUrl = 'http://127.0.0.1:8000/api';
  userName = 'User';

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadUser();
  }

  loadUser(): void {
    const storedUser = localStorage.getItem('planora_user');

    if (!storedUser) {
      this.userName = 'User';
      return;
    }

    try {
      const user = JSON.parse(storedUser);
      this.userName = user?.name || 'User';
    } catch {
      this.userName = 'User';
    }
  }

  logout(): void {
    this.http.post(`${this.apiUrl}/logout`, {}).subscribe({
      next: () => {
        this.clearSession();
      },
      error: () => {
        this.clearSession();
      }
    });
  }

  clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('planora_token');
    localStorage.removeItem('planora_user');

    this.router.navigate(['/login']);
  }
}