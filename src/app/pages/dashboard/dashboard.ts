import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
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
  | 'todo'
  | 'in_progress'
  | 'in_review'
  | 'ready_for_development'
  | 'dev_in_progress'
  | 'ready_for_testing'
  | 'ready_for_uat'
  | 'done'
  | 'completed';

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
  kanban_columns?: KanbanColumn[];
}

interface KanbanColumn {
  id: number;
  workspace_id: number;
  name: string;
  slug: string;
  position: number;
  status_key?: TicketStatus | string | null;
  is_backlog_column: boolean;
  is_done_column: boolean;
  tickets?: Ticket[];
}

interface Ticket {
  id: number;
  workspace_id: number;
  kanban_column_id?: number | null;
  title: string;
  description?: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  due_date?: string | null;
  due_date_warning?: string | null;
  suggested_priority?: string | null;
  assigned_to?: number | null;
  assignee?: {
    id: number;
    name?: string | null;
    email?: string | null;
  } | null;
  kanban_column?: KanbanColumn | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface WorkspaceDashboardItem extends Workspace {
  columns: KanbanColumn[];
  tickets: Ticket[];
  totalTickets: number;
  backlogCount: number;
  activeCount: number;
  doneCount: number;
  completedCount: number;
  urgentCount: number;
  overdueCount: number;
  completionPercentage: number;
}

interface DashboardTotals {
  total_workspaces: number;
  total_tickets: number;
  backlog_tickets: number;
  active_tickets: number;
  done_tickets: number;
  completed_tickets: number;
  urgent_tickets: number;
  overdue_tickets: number;
}

interface NeedsAttentionTicket extends Ticket {
  workspace_name: string;
  column_name: string;
  reason: string;
  reason_class: string;
}

interface DashboardNotification {
  id: string;
  type: 'assigned_ticket' | 'comment' | 'activity';
  title: string;
  message: string;
  ticket_id: number;
  ticket_title: string;
  workspace_id: number;
  workspace_name: string;
  kanban_column_id?: number | null;
  kanban_column_name?: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, AppSidebar, BaseChartDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  apiUrl = environment.apiUrl;

  loading = true;
  errorMessage = '';

  workspaces: Workspace[] = [];
  workspaceDashboards: WorkspaceDashboardItem[] = [];
  needsAttentionTickets: NeedsAttentionTicket[] = [];

  showNotifications = false;
  loadingNotifications = false;
  notificationError = '';
  notifications: DashboardNotification[] = [];

  selectedWorkspaceChartId: number | null = null;
  selectedWorkspaceChart: WorkspaceDashboardItem | null = null;

  totals: DashboardTotals = {
    total_workspaces: 0,
    total_tickets: 0,
    backlog_tickets: 0,
    active_tickets: 0,
    done_tickets: 0,
    completed_tickets: 0,
    urgent_tickets: 0,
    overdue_tickets: 0,
  };

  workspaceBarChartType: 'bar' = 'bar';

  workspaceBarChartData: ChartData<'bar'> = {
    labels: [],
    datasets: []
  };

  workspaceBarChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#42546f',
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: '#7a8798',
          font: {
            size: 11,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(84, 122, 149, 0.12)'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y || 0;
            return `Tickets: ${value}`;
          }
        }
      }
    }
  };

  private chartColors = [
    '#dbe7ef',
    '#c7d6e2',
    '#b9ccd9',
    '#9fb5c7',
    '#8faabd',
    '#6f8ea5',
    '#547a95',
    '#3f637c',
    '#18394f',
  ];

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.loadNotifications();
  }

  getAuthHeaders() {
    const token = localStorage.getItem('token') || localStorage.getItem('planora_token');

    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    };
  }

  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';

    this.http.get<any>(`${this.apiUrl}/projects`, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (res) => {
        this.workspaces = this.extractWorkspaceArray(res);

        if (this.workspaces.length === 0) {
          this.workspaceDashboards = [];
          this.needsAttentionTickets = [];
          this.recalculateTotals();
          this.buildWorkspaceBarChart();
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }

        const columnRequests = this.workspaces.map(workspace =>
          this.http.get<any>(`${this.apiUrl}/projects/${workspace.id}/kanban-columns`, {
            headers: this.getAuthHeaders()
          }).pipe(
            catchError((err) => {
              console.error(`Kanban columns API error for workspace ${workspace.id}:`, err);
              return of([]);
            })
          )
        );

        forkJoin(columnRequests).subscribe({
          next: (columnResponses) => {
            this.workspaceDashboards = this.workspaces.map((workspace, index) => {
              const columns = this.extractColumnArray(columnResponses[index])
                .sort((a, b) => a.position - b.position);

              return this.buildWorkspaceDashboardItem(workspace, columns);
            });

            this.recalculateTotals();
            this.buildNeedsAttentionTickets();
            this.buildWorkspaceBarChart();

            this.loading = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Dashboard Kanban loading error:', err);

            this.errorMessage =
              err?.error?.message ||
              'Unable to load workspace Kanban data. Please try again.';

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

  loadNotifications(): void {
    this.loadingNotifications = true;
    this.notificationError = '';

    this.http.get<any>(`${this.apiUrl}/dashboard/notifications`, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (res) => {
        this.notifications = Array.isArray(res?.data) ? res.data : [];
        this.loadingNotifications = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Notifications error:', err);

        this.notificationError =
          err?.error?.message ||
          'Unable to load notifications.';

        this.loadingNotifications = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;

    if (this.showNotifications) {
      this.loadNotifications();
    }
  }

  closeNotifications(): void {
    this.showNotifications = false;
  }

  getNotificationIcon(type: string): string {
    if (type === 'assigned_ticket') return '✓';
    if (type === 'comment') return '💬';
    if (type === 'activity') return '◷';

    return '•';
  }

  getNotificationTypeLabel(type: string): string {
    if (type === 'assigned_ticket') return 'Assigned Ticket';
    if (type === 'comment') return 'Comment';
    if (type === 'activity') return 'Activity';

    return 'Notification';
  }

  openNotification(notification: DashboardNotification): void {
    this.closeNotifications();
    this.openWorkspaceBoard(notification.workspace_id);
  }

  buildWorkspaceDashboardItem(
    workspace: Workspace,
    columns: KanbanColumn[]
  ): WorkspaceDashboardItem {
    const tickets = columns.flatMap(column => {
      return (column.tickets || []).map(ticket => ({
        ...ticket,
        workspace_id: ticket.workspace_id || workspace.id,
        kanban_column_id: ticket.kanban_column_id || column.id,
        kanban_column: ticket.kanban_column || column
      }));
    });

    const totalTickets = tickets.length;

    const backlogColumnIds = columns
      .filter(column => column.is_backlog_column)
      .map(column => column.id);

    const doneColumnIds = columns
      .filter(column => column.is_done_column)
      .map(column => column.id);

    const backlogCount = tickets.filter(ticket =>
      ticket.status === 'todo' ||
      backlogColumnIds.includes(Number(ticket.kanban_column_id))
    ).length;

    const doneCount = tickets.filter(ticket =>
      ticket.status === 'done' ||
      doneColumnIds.includes(Number(ticket.kanban_column_id))
    ).length;

    const completedCount = tickets.filter(ticket => ticket.status === 'completed').length;

    const activeCount = tickets.filter(ticket =>
      ticket.status !== 'done' &&
      ticket.status !== 'completed' &&
      !doneColumnIds.includes(Number(ticket.kanban_column_id))
    ).length;

    const urgentCount = tickets.filter(ticket => ticket.priority === 'urgent').length;

    const overdueCount = tickets.filter(ticket =>
      ticket.due_date_warning === 'overdue' &&
      ticket.status !== 'done' &&
      ticket.status !== 'completed'
    ).length;

    const completionPercentage =
      totalTickets > 0 ? Math.round(((doneCount + completedCount) / totalTickets) * 100) : 0;

    return {
      ...workspace,
      columns,
      tickets,
      totalTickets,
      backlogCount,
      activeCount,
      doneCount,
      completedCount,
      urgentCount,
      overdueCount,
      completionPercentage,
    };
  }

  buildWorkspaceBarChart(): void {
    if (this.workspaceDashboards.length === 0) {
      this.selectedWorkspaceChartId = null;
      this.selectedWorkspaceChart = null;

      this.workspaceBarChartData = {
        labels: [],
        datasets: []
      };

      return;
    }

    if (!this.selectedWorkspaceChartId) {
      this.selectedWorkspaceChartId = this.workspaceDashboards[0].id;
    }

    const selectedWorkspace = this.workspaceDashboards.find(
      workspace => workspace.id === Number(this.selectedWorkspaceChartId)
    );

    this.selectedWorkspaceChart = selectedWorkspace || this.workspaceDashboards[0];
    this.selectedWorkspaceChartId = this.selectedWorkspaceChart.id;

    const columns = this.selectedWorkspaceChart.columns;

    this.workspaceBarChartData = {
      labels: columns.map(column => column.name),
      datasets: [
        {
          label: this.selectedWorkspaceChart.name,
          data: columns.map(column => this.getColumnTicketCount(column)),
          backgroundColor: columns.map((_, index) => this.chartColors[index % this.chartColors.length]),
          borderColor: '#ffffff',
          borderWidth: 2,
          borderSkipped: false,
          barPercentage: 0.42,
          categoryPercentage: 0.55,
          maxBarThickness: 46
        }
      ]
    };
  }

  onWorkspaceChartChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;

    this.selectedWorkspaceChartId = Number(selectElement.value);
    this.buildWorkspaceBarChart();
  }

  recalculateTotals(): void {
    const allTickets = this.workspaceDashboards.flatMap(workspace => workspace.tickets);

    this.totals = {
      total_workspaces: this.workspaceDashboards.length,
      total_tickets: allTickets.length,

      backlog_tickets: this.workspaceDashboards.reduce((total, workspace) => {
        return total + workspace.backlogCount;
      }, 0),

      active_tickets: this.workspaceDashboards.reduce((total, workspace) => {
        return total + workspace.activeCount;
      }, 0),

      done_tickets: this.workspaceDashboards.reduce((total, workspace) => {
        return total + workspace.doneCount;
      }, 0),

      completed_tickets: allTickets.filter(ticket => ticket.status === 'completed').length,

      urgent_tickets: allTickets.filter(ticket => ticket.priority === 'urgent').length,

      overdue_tickets: allTickets.filter(ticket =>
        ticket.due_date_warning === 'overdue' &&
        ticket.status !== 'done' &&
        ticket.status !== 'completed'
      ).length,
    };
  }

  buildNeedsAttentionTickets(): void {
    const attentionTickets: NeedsAttentionTicket[] = [];

    this.workspaceDashboards.forEach(workspace => {
      workspace.tickets.forEach(ticket => {
        const reason = this.getAttentionReason(ticket);

        if (!reason) {
          return;
        }

        attentionTickets.push({
          ...ticket,
          workspace_name: workspace.name,
          column_name: this.getTicketColumnName(workspace, ticket),
          reason: reason.label,
          reason_class: reason.className
        });
      });
    });

    this.needsAttentionTickets = attentionTickets
      .sort((a, b) => this.getAttentionWeight(a) - this.getAttentionWeight(b))
      .slice(0, 5);
  }

  getAttentionReason(ticket: Ticket): { label: string; className: string } | null {
    if (ticket.status === 'done' || ticket.status === 'completed') {
      return null;
    }

    if (ticket.due_date_warning === 'overdue') {
      return {
        label: 'Overdue',
        className: 'attention-overdue'
      };
    }

    if (ticket.priority === 'urgent') {
      return {
        label: 'Urgent',
        className: 'attention-urgent'
      };
    }

    if (ticket.due_date_warning === 'due_soon') {
      return {
        label: 'Due Soon',
        className: 'attention-due-soon'
      };
    }

    if (!ticket.assigned_to && !ticket.assignee) {
      return {
        label: 'Unassigned',
        className: 'attention-unassigned'
      };
    }

    return null;
  }

  getAttentionWeight(ticket: NeedsAttentionTicket): number {
    if (ticket.reason === 'Overdue') return 1;
    if (ticket.reason === 'Urgent') return 2;
    if (ticket.reason === 'Due Soon') return 3;
    if (ticket.reason === 'Unassigned') return 4;

    return 5;
  }

  getColumnTicketCount(column: KanbanColumn): number {
    return column.tickets?.length || 0;
  }

  getTicketColumnName(workspace: WorkspaceDashboardItem, ticket: Ticket): string {
    if (ticket.kanban_column?.name) {
      return ticket.kanban_column.name;
    }

    const column = workspace.columns.find(item => item.id === Number(ticket.kanban_column_id));

    return column?.name || this.getStatusLabel(ticket.status);
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

  extractColumnArray(res: any): KanbanColumn[] {
    if (Array.isArray(res)) {
      return res;
    }

    if (Array.isArray(res?.data)) {
      return res.data;
    }

    if (Array.isArray(res?.data?.data)) {
      return res.data.data;
    }

    if (Array.isArray(res?.columns)) {
      return res.columns;
    }

    if (Array.isArray(res?.data?.columns)) {
      return res.data.columns;
    }

    if (Array.isArray(res?.kanban_columns)) {
      return res.kanban_columns;
    }

    if (Array.isArray(res?.data?.kanban_columns)) {
      return res.data.kanban_columns;
    }

    return [];
  }

  getWorkspaceInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : 'W';
  }

  getRoleLabel(role: string | null | undefined): string {
    if (!role) {
      return 'Member';
    }

    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  getWorkspaceCompletionLabel(workspace: WorkspaceDashboardItem): string {
    if (workspace.totalTickets === 0) {
      return 'No tickets yet';
    }

    return `${workspace.completionPercentage}% complete`;
  }

  getStatusLabel(status: TicketStatus | string): string {
    const labels: Record<string, string> = {
      todo: 'Backlog',
      in_progress: 'In Progress',
      in_review: 'In Review',
      ready_for_development: 'Ready for Development',
      dev_in_progress: 'Dev in Progress',
      ready_for_testing: 'Ready for Testing',
      ready_for_uat: 'Ready for UAT',
      done: 'Done',
      completed: 'Completed / Archived'
    };

    return labels[status] || status;
  }

  getPriorityLabel(priority: TicketPriority): string {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }

  openWorkspaceBoard(workspaceId: number): void {
    this.router.navigate(['/projects', workspaceId, 'board']);
  }

  openWorkspaceActivity(workspaceId: number): void {
    this.router.navigate(['/projects', workspaceId, 'activity']);
  }

  goToWorkspaces(): void {
    this.router.navigate(['/projects']);
  }
}