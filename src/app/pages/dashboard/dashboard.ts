import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface DashboardStats {
  total_workspaces: number;
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  done_tickets: number;
  urgent_tickets: number;
}

interface Workspace {
  id: number;
  name: string;
  description?: string | null;
  role?: 'owner' | 'editor' | 'viewer';
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  userName = 'User';

  stats: DashboardStats = {
    total_workspaces: 0,
    total_tickets: 0,
    open_tickets: 0,
    in_progress_tickets: 0,
    done_tickets: 0,
    urgent_tickets: 0,
  };

  workspaces: Workspace[] = [];

  loading = true;
  loadingWorkspaces = true;
  errorMessage = '';

  sidebarWorkspacesOpen = true;

  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUser();
    this.loadDashboard();
    this.loadSidebarWorkspaces();
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

  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';

    this.http.get<any>(`${this.apiUrl}/dashboard`).subscribe({
      next: (res) => {
        console.log('Dashboard API response:', res);

        const rawStats = this.extractDashboardData(res);
        this.stats = this.normalizeDashboardStats(rawStats);

        console.log('Normalized dashboard stats:', this.stats);

        this.loading = false;

        // Needed so the UI updates immediately after the API response.
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Dashboard API error:', err);

        this.errorMessage =
          err?.error?.message ||
          'Unable to load dashboard data. Please try again.';

        this.loading = false;

        // Needed so the error/loading state updates immediately.
        this.cdr.detectChanges();
      }
    });
  }

  extractDashboardData(res: any): any {
    /*
      Why this exists:
      Your backend may return dashboard data in different shapes.

      Examples:
      { data: { total_workspaces: 3 } }
      { data: { dashboard: { total_workspaces: 3 } } }
      { dashboard: { total_workspaces: 3 } }
      { total_workspaces: 3 }

      This safely extracts the actual dashboard stats object.
    */

    if (res?.data?.dashboard) {
      return res.data.dashboard;
    }

    if (res?.data?.stats) {
      return res.data.stats;
    }

    if (res?.data) {
      return res.data;
    }

    if (res?.dashboard) {
      return res.dashboard;
    }

    if (res?.stats) {
      return res.stats;
    }

    return res || {};
  }

  normalizeDashboardStats(data: any): DashboardStats {
    /*
      Why this exists:
      If a backend field is undefined, graph calculations can become NaN.
      This converts every dashboard value into a safe number.
    */

    return {
      total_workspaces: this.toNumber(
        data?.total_workspaces ??
        data?.totalWorkspaces ??
        data?.workspaces_count ??
        data?.workspace_count
      ),

      total_tickets: this.toNumber(
        data?.total_tickets ??
        data?.totalTickets ??
        data?.tickets_count ??
        data?.ticket_count
      ),

      open_tickets: this.toNumber(
        data?.open_tickets ??
        data?.openTickets ??
        data?.todo_tickets ??
        data?.todoTickets ??
        data?.todo
      ),

      in_progress_tickets: this.toNumber(
        data?.in_progress_tickets ??
        data?.inProgressTickets ??
        data?.in_progress
      ),

      done_tickets: this.toNumber(
        data?.done_tickets ??
        data?.doneTickets ??
        data?.completed_tickets ??
        data?.completedTickets ??
        data?.done
      ),

      urgent_tickets: this.toNumber(
        data?.urgent_tickets ??
        data?.urgentTickets ??
        data?.urgent
      ),
    };
  }

  toNumber(value: any): number {
    const converted = Number(value);

    return Number.isFinite(converted) ? converted : 0;
  }

  loadSidebarWorkspaces(): void {
    this.loadingWorkspaces = true;

    this.http.get<any>(`${this.apiUrl}/workspaces`).subscribe({
      next: (res) => {
        console.log('Workspaces API response:', res);

        this.workspaces = this.extractWorkspaceArray(res);

        console.log('Sidebar workspaces:', this.workspaces);

        this.loadingWorkspaces = false;

        // Needed so the sidebar workspace list updates immediately.
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Workspaces API error:', err);

        this.workspaces = [];
        this.loadingWorkspaces = false;

        // Needed so "Loading spaces..." disappears even if the request fails.
        this.cdr.detectChanges();
      }
    });
  }

  extractWorkspaceArray(res: any): Workspace[] {
    /*
      Why this exists:
      Laravel can return workspaces in different response formats.

      Examples:
      [ ... ]
      { data: [ ... ] }
      { data: { data: [ ... ] } }

      This safely extracts the actual workspace array.
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

  goToWorkspaces(): void {
    this.router.navigate(['/workspaces']);
  }

  toggleWorkspaceDropdown(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }

    this.sidebarWorkspacesOpen = !this.sidebarWorkspacesOpen;

    this.cdr.detectChanges();
  }

  openWorkspaceBoard(workspaceId: number): void {
    this.router.navigate(['/workspaces', workspaceId, 'board']);
  }

  getTotalTrackedTickets(): number {
    return (
      this.stats.open_tickets +
      this.stats.in_progress_tickets +
      this.stats.done_tickets
    );
  }

  getStatusPercentage(value: number): number {
    const total = this.getTotalTrackedTickets();

    if (total <= 0) {
      return 0;
    }

    return Math.round((value / total) * 100);
  }

  getCompletionPercentage(): number {
    const total = this.getTotalTrackedTickets();

    if (total <= 0) {
      return 0;
    }

    return Math.round((this.stats.done_tickets / total) * 100);
  }

  getUrgentPercentage(): number {
    const total = this.stats.total_tickets;

    if (total <= 0) {
      return 0;
    }

    return Math.round((this.stats.urgent_tickets / total) * 100);
  }

  logout(): void {
    this.http.post(`${this.apiUrl}/logout`, {}).subscribe({
      next: () => {
        this.clearSession();
      },
      error: () => {
        /*
          Even if backend logout fails, we still clear frontend session.
          This keeps the user safely logged out from Angular.
        */
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