import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { BaseChartDirective } from 'ng2-charts';
import {
  Chart,
  ChartConfiguration,
  ChartData,
  registerables
} from 'chart.js';

import { AppSidebar } from '../../components/app-sidebar/app-sidebar';

Chart.register(...registerables);

type TicketStatus =
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'in_review'
  | 'done';

type TicketPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent';

interface Workspace {
  id: number;
  name: string;
  description?: string | null;
  role?: 'owner' | 'editor' | 'viewer';
}

interface Ticket {
  id: number;
  workspace_id: number;
  title: string;
  description?: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  due_date?: string | null;
  due_date_warning?: string | null;
  suggested_priority?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface WorkspaceDashboardItem extends Workspace {
  tickets: Ticket[];
  totalTickets: number;
  backlogCount: number;
  todoCount: number;
  inProgressCount: number;
  inReviewCount: number;
  doneCount: number;
  urgentCount: number;
  completionPercentage: number;
  chartData: ChartData<'doughnut'>;
}

interface DashboardTotals {
  total_workspaces: number;
  total_tickets: number;
  backlog_tickets: number;
  todo_tickets: number;
  in_progress_tickets: number;
  in_review_tickets: number;
  done_tickets: number;
  urgent_tickets: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, AppSidebar, BaseChartDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  apiUrl = 'http://127.0.0.1:8000/api';

  loading = true;
  errorMessage = '';

  workspaces: Workspace[] = [];
  workspaceDashboards: WorkspaceDashboardItem[] = [];

  totals: DashboardTotals = {
    total_workspaces: 0,
    total_tickets: 0,
    backlog_tickets: 0,
    todo_tickets: 0,
    in_progress_tickets: 0,
    in_review_tickets: 0,
    done_tickets: 0,
    urgent_tickets: 0,
  };

  chartType: 'doughnut' = 'doughnut';

  chartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          padding: 14,
          color: '#475569',
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || 'Status';
            const value = context.parsed || 0;

            return `${label}: ${value}`;
          }
        }
      }
    }
  };

  private chartColors = [
    '#94a3b8',
    '#547A95',
    '#f59e0b',
    '#7c3aed',
    '#16a34a'
  ];

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';

    this.http.get<any>(`${this.apiUrl}/workspaces`).subscribe({
      next: (res) => {
        this.workspaces = this.extractWorkspaceArray(res);

        if (this.workspaces.length === 0) {
          this.workspaceDashboards = [];
          this.recalculateTotals();
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }

        const ticketRequests = this.workspaces.map(workspace =>
          this.http.get<any>(`${this.apiUrl}/workspaces/${workspace.id}/tickets`).pipe(
            catchError((err) => {
              console.error(`Tickets API error for workspace ${workspace.id}:`, err);
              return of([]);
            })
          )
        );

        forkJoin(ticketRequests).subscribe({
          next: (ticketResponses) => {
            this.workspaceDashboards = this.workspaces.map((workspace, index) => {
              const tickets = this.extractTicketArray(ticketResponses[index]);

              return this.buildWorkspaceDashboardItem(workspace, tickets);
            });

            this.recalculateTotals();

            this.loading = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Dashboard ticket loading error:', err);

            this.errorMessage =
              err?.error?.message ||
              'Unable to load workspace ticket data. Please try again.';

            this.loading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        console.error('Workspaces API error:', err);

        this.errorMessage =
          err?.error?.message ||
          'Unable to load your workspaces. Please try again.';

        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  buildWorkspaceDashboardItem(
    workspace: Workspace,
    tickets: Ticket[]
  ): WorkspaceDashboardItem {
    const backlogCount = tickets.filter(ticket => ticket.status === 'backlog').length;
    const todoCount = tickets.filter(ticket => ticket.status === 'todo').length;
    const inProgressCount = tickets.filter(ticket => ticket.status === 'in_progress').length;
    const inReviewCount = tickets.filter(ticket => ticket.status === 'in_review').length;
    const doneCount = tickets.filter(ticket => ticket.status === 'done').length;
    const urgentCount = tickets.filter(ticket => ticket.priority === 'urgent').length;

    const totalTickets = tickets.length;
    const completionPercentage =
      totalTickets > 0 ? Math.round((doneCount / totalTickets) * 100) : 0;

    return {
      ...workspace,
      tickets,
      totalTickets,
      backlogCount,
      todoCount,
      inProgressCount,
      inReviewCount,
      doneCount,
      urgentCount,
      completionPercentage,
      chartData: this.buildTicketStatusChartData(
        backlogCount,
        todoCount,
        inProgressCount,
        inReviewCount,
        doneCount
      )
    };
  }

  buildTicketStatusChartData(
    backlogCount: number,
    todoCount: number,
    inProgressCount: number,
    inReviewCount: number,
    doneCount: number
  ): ChartData<'doughnut'> {
    return {
      labels: ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'],
      datasets: [
        {
          data: [
            backlogCount,
            todoCount,
            inProgressCount,
            inReviewCount,
            doneCount
          ],
          backgroundColor: this.chartColors,
          borderColor: '#ffffff',
          borderWidth: 3
        }
      ]
    };
  }

  recalculateTotals(): void {
    const allTickets = this.workspaceDashboards.flatMap(workspace => workspace.tickets);

    this.totals = {
      total_workspaces: this.workspaceDashboards.length,
      total_tickets: allTickets.length,
      backlog_tickets: allTickets.filter(ticket => ticket.status === 'backlog').length,
      todo_tickets: allTickets.filter(ticket => ticket.status === 'todo').length,
      in_progress_tickets: allTickets.filter(ticket => ticket.status === 'in_progress').length,
      in_review_tickets: allTickets.filter(ticket => ticket.status === 'in_review').length,
      done_tickets: allTickets.filter(ticket => ticket.status === 'done').length,
      urgent_tickets: allTickets.filter(ticket => ticket.priority === 'urgent').length,
    };
  }

  extractWorkspaceArray(res: any): Workspace[] {
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

    if (Array.isArray(res?.data?.workspaces)) {
      return res.data.workspaces;
    }

    return [];
  }

  extractTicketArray(res: any): Ticket[] {
    if (Array.isArray(res)) {
      return res;
    }

    if (Array.isArray(res?.data)) {
      return res.data;
    }

    if (Array.isArray(res?.data?.data)) {
      return res.data.data;
    }

    if (Array.isArray(res?.tickets)) {
      return res.tickets;
    }

    if (Array.isArray(res?.data?.tickets)) {
      return res.data.tickets;
    }

    return [];
  }

  getWorkspaceInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : 'W';
  }

  getRoleLabel(role: string | null | undefined): string {
    if (!role) {
      return 'member';
    }

    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  getWorkspaceCompletionLabel(workspace: WorkspaceDashboardItem): string {
    if (workspace.totalTickets === 0) {
      return 'No tickets yet';
    }

    return `${workspace.completionPercentage}% complete`;
  }

  openWorkspaceBoard(workspaceId: number): void {
    this.router.navigate(['/workspaces', workspaceId, 'board']);
  }

  openWorkspaceActivity(workspaceId: number): void {
    this.router.navigate(['/workspaces', workspaceId, 'activity']);
  }

  goToWorkspaces(): void {
    this.router.navigate(['/workspaces']);
  }
}