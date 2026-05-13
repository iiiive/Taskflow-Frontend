import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface Workspace {
  id: number;
  owner_id?: number;
  name: string;
  description?: string | null;
  role?: 'owner' | 'editor' | 'viewer';
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'app-workspaces',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './workspaces.html',
  styleUrl: './workspaces.scss',
})
export class Workspaces implements OnInit {
  userName = 'User';

  workspaces: Workspace[] = [];

  name = '';
  description = '';

  loading = true;
  creating = false;
  errorMessage = '';
  successMessage = '';

  showCreateModal = false;

  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUser();
    this.loadWorkspaces();
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

  loadWorkspaces(): void {
    this.loading = true;
    this.errorMessage = '';

    this.http.get<any>(`${this.apiUrl}/workspaces`).subscribe({
      next: (res) => {
        console.log('Workspaces API response:', res);

        this.workspaces = this.extractWorkspaceArray(res);

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Workspaces API error:', err);

        this.loading = false;
        this.errorMessage =
          err?.error?.message ||
          'Unable to load workspaces. Please try again.';

        this.cdr.detectChanges();
      }
    });
  }

  extractWorkspaceArray(res: any): Workspace[] {
    /*
      Why this exists:
      Laravel can return resource collections in different response shapes.

      Examples:
      { data: [...] }
      { data: { data: [...] } }
      [...]
    */

    if (Array.isArray(res)) {
      return res;
    }

    if (Array.isArray(res?.data)) {
      return res.data;
    }

    if (Array.isArray(res?.data?.data)) {
      return res.data.data;
    }

    if (Array.isArray(res?.workspaces)) {
      return res.workspaces;
    }

    return [];
  }

  openCreateModal(): void {
    this.showCreateModal = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.cdr.detectChanges();
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.name = '';
    this.description = '';
    this.errorMessage = '';

    this.cdr.detectChanges();
  }

  createWorkspace(): void {
    if (!this.name.trim()) {
      this.errorMessage = 'Workspace name is required.';
      this.successMessage = '';
      this.cdr.detectChanges();
      return;
    }

    this.creating = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      name: this.name.trim(),
      description: this.description.trim()
    };

    this.http.post<any>(`${this.apiUrl}/workspaces`, payload).subscribe({
      next: (res) => {
        const newWorkspace = res?.data ? res.data : res;

        this.workspaces = [newWorkspace, ...this.workspaces];

        this.name = '';
        this.description = '';

        this.creating = false;
        this.showCreateModal = false;
        this.successMessage = 'Workspace created successfully.';

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Create workspace error:', err);

        this.creating = false;
        this.errorMessage =
          err?.error?.message ||
          'Unable to create workspace. Please check your input.';

        this.cdr.detectChanges();
      }
    });
  }

  openWorkspace(workspaceId: number): void {
    this.router.navigate(['/workspaces', workspaceId, 'board']);
  }

  deleteWorkspace(workspace: Workspace): void {
    const confirmed = confirm(
      `Are you sure you want to delete "${workspace.name}"?`
    );

    if (!confirmed) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.http.delete<any>(`${this.apiUrl}/workspaces/${workspace.id}`).subscribe({
      next: () => {
        this.workspaces = this.workspaces.filter(
          item => item.id !== workspace.id
        );

        this.successMessage = 'Workspace deleted successfully.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Delete workspace error:', err);

        this.errorMessage =
          err?.error?.message ||
          'Unable to delete workspace. You may not have permission.';

        this.cdr.detectChanges();
      }
    });
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