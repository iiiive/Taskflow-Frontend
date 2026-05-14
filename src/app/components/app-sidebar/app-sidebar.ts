import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth/auth';

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
    | 'profile'
    | 'backlog'
    | 'board'
    | 'activity'
    | '' = '';

  @Input() workspaceId: number | null = null;

  userName = 'User';
  userEmail = '';
  avatarUrl: string | null = null;

  constructor(
    private router: Router,
    private auth: Auth
  ) {}

  ngOnInit(): void {
    this.loadStoredUser();
    this.loadProfile();
  }

  loadStoredUser(): void {
    const storedUser = localStorage.getItem('planora_user');

    if (!storedUser) {
      return;
    }

    try {
      const user = JSON.parse(storedUser);
      this.setUserDisplay(user);
    } catch {
      this.userName = 'User';
      this.userEmail = '';
      this.avatarUrl = null;
    }
  }

  loadProfile(): void {
    this.auth.getProfile().subscribe({
      next: (res: any) => {
        const user = res?.user || res?.data || res;

        if (user) {
          localStorage.setItem('planora_user', JSON.stringify(user));
          this.setUserDisplay(user);
        }
      },
      error: () => {
        this.loadStoredUser();
      }
    });
  }

  setUserDisplay(user: any): void {
    this.userName = user?.name || 'User';
    this.userEmail = user?.email || '';
    this.avatarUrl = user?.avatar_url || user?.avatar || null;
  }

  getUserInitial(): string {
    return this.userName ? this.userName.charAt(0).toUpperCase() : 'U';
  }

  logout(): void {
    this.auth.logout().subscribe({
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