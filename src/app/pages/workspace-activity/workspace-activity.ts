import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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

interface ActivityWorkflowStat {
  key: string;
  name: string;
  count: number;
  position: number;
  color: string;
  is_done_column?: boolean;
  is_backlog_column?: boolean;
}

interface KanbanColumnResponse {
  id: number;
  name: string;
  slug?: string;
  position?: number;
  status_key?: string | null;
  is_backlog_column?: boolean;
  is_done_column?: boolean;
}

@Component({
  selector: 'app-workspace-activity',
  standalone: true,
  imports: [CommonModule, AppSidebar, BaseChartDirective],
  templateUrl: './workspace-activity.html',
  styleUrl: './workspace-activity.scss'
})
export class WorkspaceActivity implements OnInit {
  apiUrl = environment.apiUrl;
  workspaceId!: number;
  workspace: Workspace | null = null;

  tickets: Ticket[] = [];
  activityLogs: ActivityLog[] = [];
  kanbanColumns: KanbanColumnResponse[] = [];

  workflowStats: ActivityWorkflowStat[] = [];

  loadingWorkspace = true;
  loadingTickets = true;
  loadingActivity = true;
  loadingColumns = true;

  errorMessage = '';

  totalTickets = 0;
  completedCount = 0;

  ticketStatusChartType: 'doughnut' = 'doughnut';

  ticketStatusChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [],
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
            const label = context.label || 'Column';
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
    '#0891b2',
    '#16a34a',
    '#334155',
    '#db2777',
    '#ea580c',
    '#0f766e'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.workspaceId = Number(this.route.snapshot.paramMap.get('id'));

    if (!this.workspaceId) {
      this.router.navigate(['/projects']);
      return;
    }

    this.loadWorkspace();
    this.loadWorkspaceKanbanColumns();
    this.loadWorkspaceTickets();
    this.loadWorkspaceActivity();
  }

  loadWorkspace(): void {
    this.loadingWorkspace = true;

    this.http.get<ApiResponse<Workspace> | Workspace>(
      `${this.apiUrl}/projects/${this.workspaceId}`
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

  loadWorkspaceKanbanColumns(): void {
    this.loadingColumns = true;

    this.http.get<ApiResponse<KanbanColumnResponse[]> | KanbanColumnResponse[]>(
      `${this.apiUrl}/projects/${this.workspaceId}/kanban-columns`
    ).subscribe({
      next: (res) => {
        this.kanbanColumns = this.extractArray<KanbanColumnResponse>(res)
          .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0));

        this.loadingColumns = false;
        this.buildTicketStatusStats();
        this.buildTicketStatusChart();

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Kanban columns endpoint failed. Falling back to ticket kanbanColumn data.', err);

        this.kanbanColumns = [];
        this.loadingColumns = false;
        this.buildTicketStatusStats();
        this.buildTicketStatusChart();

        this.cdr.detectChanges();
      }
    });
  }

  loadWorkspaceTickets(): void {
    this.loadingTickets = true;

    this.http.get<ApiResponse<Ticket[]> | Ticket[]>(
      `${this.apiUrl}/projects/${this.workspaceId}/tickets`
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
      `${this.apiUrl}/projects/${this.workspaceId}/activity`
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

    const statsMap = new Map<string, ActivityWorkflowStat>();

    this.kanbanColumns.forEach((column, index) => {
      const key = this.getColumnKeyFromColumn(column);

      statsMap.set(key, {
        key,
        name: column.name || this.formatStatusLabel(column.status_key || column.slug || key),
        count: 0,
        position: Number(column.position ?? index),
        color: this.chartColors[index % this.chartColors.length],
        is_done_column: Boolean(column.is_done_column),
        is_backlog_column: Boolean(column.is_backlog_column)
      });
    });

    this.tickets.forEach((ticket: any) => {
      const column = this.getTicketColumn(ticket);
      const key = this.getTicketColumnKey(ticket);
      const name = this.getTicketColumnName(ticket);
      const position = Number(column?.position ?? statsMap.size);

      if (!statsMap.has(key)) {
        statsMap.set(key, {
          key,
          name,
          count: 0,
          position,
          color: this.chartColors[statsMap.size % this.chartColors.length],
          is_done_column: Boolean(column?.is_done_column),
          is_backlog_column: Boolean(column?.is_backlog_column)
        });
      }

      const current = statsMap.get(key);

      if (current) {
        current.count += 1;

        if (column?.is_done_column) {
          current.is_done_column = true;
        }
      }
    });

    this.workflowStats = Array.from(statsMap.values())
      .sort((a, b) => a.position - b.position);

    this.completedCount = this.tickets.filter((ticket: any) => {
      const column = this.getTicketColumn(ticket);
      const columnName = String(column?.name || '').toLowerCase();
      const status = String(ticket?.status || '').toLowerCase();

      return Boolean(column?.is_done_column) ||
        status === 'completed' ||
        columnName === 'archived';
    }).length;
  }

  buildTicketStatusChart(): void {
    const visibleStats = this.workflowStats.filter(stat => stat.count > 0);

    this.ticketStatusChartData = {
      labels: visibleStats.map(stat => stat.name),
      datasets: [
        {
          data: visibleStats.map(stat => stat.count),
          backgroundColor: visibleStats.map(stat => stat.color),
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

  getTicketColumn(ticket: any): any {
    return ticket?.kanban_column || ticket?.kanbanColumn || null;
  }

  getTicketColumnKey(ticket: any): string {
    const column = this.getTicketColumn(ticket);

    if (column?.id) {
      return `column_${column.id}`;
    }

    if (ticket?.kanban_column_id) {
      return `column_${ticket.kanban_column_id}`;
    }

    if (ticket?.status) {
      return `status_${ticket.status}`;
    }

    return 'unknown';
  }

  getTicketColumnName(ticket: any): string {
    const column = this.getTicketColumn(ticket);

    if (column?.name) {
      return column.name;
    }

    return this.formatStatusLabel(ticket?.status || 'Unknown');
  }

  getColumnKeyFromColumn(column: KanbanColumnResponse): string {
    if (column.id) {
      return `column_${column.id}`;
    }

    if (column.status_key) {
      return `status_${column.status_key}`;
    }

    if (column.slug) {
      return `slug_${column.slug}`;
    }

    return `column_${column.name}`;
  }

  formatStatusLabel(value: string): string {
    if (!value) {
      return 'Unknown';
    }

    return value
      .replaceAll('_', ' ')
      .replaceAll('-', ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
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
      ticket_completed: 'Ticket Archived',
      ticket_archived: 'Ticket Archived',
      ticket_moved: 'Ticket Moved',
      ticket_status_updated: 'Ticket Moved',
      ticket_priority_updated: 'Priority Updated',
      ticket_assignee_updated: 'Assignee Updated',
      ticket_title_updated: 'Title Updated',
      ticket_description_updated: 'Description Updated',
      ticket_due_date_updated: 'Due Date Updated',
      ticket_epic_updated: 'Epic Updated',
      status_changed: 'Status Changed',
      priority_changed: 'Priority Changed',
      assignee_changed: 'Assignee Changed',
      comment_added: 'Comment Added',
      attachment_uploaded: 'Attachment Uploaded',
      attachment_deleted: 'Attachment Deleted',
      member_added: 'Member Added',
      member_updated: 'Member Updated',
      member_removed: 'Member Removed',
      time_logged: 'Time Logged'
    };

    return labels[action] || this.formatStatusLabel(action);
  }

  getActionClass(action: string): string {
    return `action-${action}`;
  }

  goBackToBoard(): void {
    this.router.navigate(['/projects', this.workspaceId, 'board']);
  }

  goBackToBacklog(): void {
    this.router.navigate(['/projects', this.workspaceId, 'backlog']);
  }

  goToArchive(): void {
    this.router.navigate(['/projects', this.workspaceId, 'archive']);
  }

  goBackToWorkspaces(): void {
    this.router.navigate(['/projects']);
  }

  goToTimesheet(): void {
    this.router.navigate(['/projects', this.workspaceId, 'timesheet']);
  }
}