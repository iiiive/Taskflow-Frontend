import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { BaseChartDirective } from 'ng2-charts';
import {
  Chart,
  ChartConfiguration,
  ChartData,
  registerables
} from 'chart.js';

import { AppSidebar } from '../../components/app-sidebar/app-sidebar';

import {
  ActivityLog,
  ApiResponse,
  Workspace,
  Ticket
} from '../../interfaces/planora.interface';

Chart.register(...registerables);

@Component({
  selector: 'app-workspace-activity',
  standalone: true,
  imports: [CommonModule, AppSidebar, BaseChartDirective],
  templateUrl: './workspace-activity.html',
  styleUrl: './workspace-activity.scss'
})
export class WorkspaceActivity implements OnInit {
  apiUrl = 'http://127.0.0.1:8000/api';

  workspaceId!: number;
  workspace: Workspace | null = null;

  tickets: Ticket[] = [];
  activityLogs: ActivityLog[] = [];

  loadingWorkspace = true;
  loadingTickets = true;
  loadingActivity = true;

  errorMessage = '';

  totalTickets = 0;
  backlogCount = 0;
  todoCount = 0;
  inProgressCount = 0;
  inReviewCount = 0;
  doneCount = 0;

  ticketStatusChartType: 'doughnut' = 'doughnut';

  ticketStatusChartData: ChartData<'doughnut'> = {
    labels: ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'],
    datasets: [
      {
        data: [0, 0, 0, 0, 0],
        backgroundColor: [
          '#94a3b8',
          '#547A95',
          '#f59e0b',
          '#7c3aed',
          '#16a34a'
        ],
        borderColor: '#ffffff',
        borderWidth: 3
      }
    ]
  };

  ticketStatusChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          padding: 16,
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.workspaceId = Number(this.route.snapshot.paramMap.get('id'));

    if (!this.workspaceId) {
      this.router.navigate(['/workspaces']);
      return;
    }

    this.loadWorkspace();
    this.loadWorkspaceTickets();
    this.loadWorkspaceActivity();
  }

  loadWorkspace(): void {
    this.loadingWorkspace = true;

    this.http.get<ApiResponse<Workspace> | Workspace>(
      `${this.apiUrl}/workspaces/${this.workspaceId}`
    ).subscribe({
      next: (res) => {
        this.workspace = this.extractSingle<Workspace>(res);
        this.loadingWorkspace = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Load workspace error:', err);

        this.loadingWorkspace = false;
        this.errorMessage =
          err?.error?.message ||
          'Unable to load workspace.';

        this.cdr.detectChanges();
      }
    });
  }

  loadWorkspaceTickets(): void {
    this.loadingTickets = true;

    this.http.get<ApiResponse<Ticket[]> | Ticket[]>(
      `${this.apiUrl}/workspaces/${this.workspaceId}/tickets`
    ).subscribe({
      next: (res) => {
        this.tickets = this.extractArray<Ticket>(res);

        this.buildTicketStatusStats();
        this.buildTicketStatusChart();

        this.loadingTickets = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Load workspace tickets error:', err);

        this.tickets = [];
        this.buildTicketStatusStats();
        this.buildTicketStatusChart();

        this.loadingTickets = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadWorkspaceActivity(): void {
    this.loadingActivity = true;
    this.errorMessage = '';

    this.http.get<ApiResponse<ActivityLog[]> | ActivityLog[]>(
      `${this.apiUrl}/workspaces/${this.workspaceId}/activity`
    ).subscribe({
      next: (res) => {
        this.activityLogs = this.extractArray<ActivityLog>(res);

        this.loadingActivity = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Load workspace activity error:', err);

        this.loadingActivity = false;
        this.errorMessage =
          err?.error?.message ||
          'Unable to load workspace activity.';

        this.cdr.detectChanges();
      }
    });
  }

  buildTicketStatusStats(): void {
    this.totalTickets = this.tickets.length;

    this.backlogCount = this.tickets.filter(
      ticket => ticket.status === 'backlog'
    ).length;

    this.todoCount = this.tickets.filter(
      ticket => ticket.status === 'todo'
    ).length;

    this.inProgressCount = this.tickets.filter(
      ticket => ticket.status === 'in_progress'
    ).length;

    this.inReviewCount = this.tickets.filter(
      ticket => ticket.status === 'in_review'
    ).length;

    this.doneCount = this.tickets.filter(
      ticket => ticket.status === 'done'
    ).length;
  }

  buildTicketStatusChart(): void {
    this.ticketStatusChartData = {
      labels: ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'],
      datasets: [
        {
          data: [
            this.backlogCount,
            this.todoCount,
            this.inProgressCount,
            this.inReviewCount,
            this.doneCount
          ],
          backgroundColor: [
            '#94a3b8',
            '#547A95',
            '#f59e0b',
            '#7c3aed',
            '#16a34a'
          ],
          borderColor: '#ffffff',
          borderWidth: 3
        }
      ]
    };
  }

  extractSingle<T>(res: ApiResponse<T> | T | any): T {
    if (res?.data) {
      return res.data as T;
    }

    return res as T;
  }

  extractArray<T>(res: ApiResponse<T[]> | T[] | any): T[] {
    if (Array.isArray(res)) {
      return res;
    }

    if (Array.isArray(res?.data)) {
      return res.data;
    }

    if (Array.isArray(res?.data?.data)) {
      return res.data.data;
    }

    return [];
  }

  getDisplayValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    return String(value);
  }

  getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      ticket_created: 'Ticket Created',
      ticket_updated: 'Ticket Updated',
      status_changed: 'Status Changed',
      priority_changed: 'Priority Changed',
      assignee_changed: 'Assignee Changed',
      comment_added: 'Comment Added',
      attachment_uploaded: 'Attachment Uploaded',
      attachment_deleted: 'Attachment Deleted',
      member_added: 'Member Added',
      member_updated: 'Member Updated',
      member_removed: 'Member Removed'
    };

    return labels[action] || action.replaceAll('_', ' ');
  }

  getActionClass(action: string): string {
    return `action-${action}`;
  }

  goBackToBoard(): void {
    this.router.navigate(['/workspaces', this.workspaceId, 'board']);
  }

  goBackToWorkspaces(): void {
    this.router.navigate(['/workspaces']);
  }
}