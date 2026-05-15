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
  | 'todo'
  | 'ready_for_development'
  | 'dev_in_progress'
  | 'ready_for_testing'
  | 'ready_for_uat'
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
  assigned_to?: number | null;
  assignee?: {
    id: number;
    name?: string | null;
    email?: string | null;
  } | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface WorkspaceDashboardItem extends Workspace {
  tickets: Ticket[];
  totalTickets: number;
  todoCount: number;
  readyForDevelopmentCount: number;
  devInProgressCount: number;
  readyForTestingCount: number;
  readyForUatCount: number;
  doneCount: number;
  urgentCount: number;
  completionPercentage: number;
}

interface DashboardTotals {
  total_workspaces: number;
  total_tickets: number;
  todo_tickets: number;
  ready_for_development_tickets: number;
  dev_in_progress_tickets: number;
  ready_for_testing_tickets: number;
  ready_for_uat_tickets: number;
  done_tickets: number;
  urgent_tickets: number;
}

interface NeedsAttentionTicket extends Ticket {
  workspace_name: string;
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
  apiUrl = 'http://127.0.0.1:8000/api';

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
    todo_tickets: 0,
    ready_for_development_tickets: 0,
    dev_in_progress_tickets: 0,
    ready_for_testing_tickets: 0,
    ready_for_uat_tickets: 0,
    done_tickets: 0,
    urgent_tickets: 0,
  };

  workspaceBarChartType: 'bar' = 'bar';

  workspaceBarChartData: ChartData<'bar'> = {
    labels: [
      'Backlog / To Do',
      'Ready for Dev',
      'Dev in Progress',
      'Ready for Testing',
      'Ready for UAT',
      'Done'
    ],
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

  private monochromePalette = {
    todo: '#dbe7ef',
    readyForDevelopment: '#b9ccd9',
    devInProgress: '#8faabd',
    readyForTesting: '#6f8ea5',
    readyForUat: '#547a95',
    done: '#18394f'
  };

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

    this.http.get<any>(`${this.apiUrl}/workspaces`, {
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

        const ticketRequests = this.workspaces.map(workspace =>
          this.http.get<any>(`${this.apiUrl}/workspaces/${workspace.id}/tickets`, {
            headers: this.getAuthHeaders()
          }).pipe(
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
            this.buildNeedsAttentionTickets();
            this.buildWorkspaceBarChart();

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

    if (notification.status === 'todo') {
      this.openWorkspaceBacklog(notification.workspace_id);
      return;
    }

    this.openWorkspaceBoard(notification.workspace_id);
  }

  buildWorkspaceDashboardItem(
    workspace: Workspace,
    tickets: Ticket[]
  ): WorkspaceDashboardItem {
    const todoCount = tickets.filter(ticket => ticket.status === 'todo').length;

    const readyForDevelopmentCount = tickets.filter(
      ticket => ticket.status === 'ready_for_development'
    ).length;

    const devInProgressCount = tickets.filter(
      ticket => ticket.status === 'dev_in_progress'
    ).length;

    const readyForTestingCount = tickets.filter(
      ticket => ticket.status === 'ready_for_testing'
    ).length;

    const readyForUatCount = tickets.filter(
      ticket => ticket.status === 'ready_for_uat'
    ).length;

    const doneCount = tickets.filter(ticket => ticket.status === 'done').length;
    const urgentCount = tickets.filter(ticket => ticket.priority === 'urgent').length;

    const totalTickets = tickets.length;
    const completionPercentage =
      totalTickets > 0 ? Math.round((doneCount / totalTickets) * 100) : 0;

    return {
      ...workspace,
      tickets,
      totalTickets,
      todoCount,
      readyForDevelopmentCount,
      devInProgressCount,
      readyForTestingCount,
      readyForUatCount,
      doneCount,
      urgentCount,
      completionPercentage,
    };
  }

  buildWorkspaceBarChart(): void {
    if (this.workspaceDashboards.length === 0) {
      this.selectedWorkspaceChartId = null;
      this.selectedWorkspaceChart = null;

      this.workspaceBarChartData = {
        labels: [
          'Backlog / To Do',
          'Ready for Dev',
          'Dev in Progress',
          'Ready for Testing',
          'Ready for UAT',
          'Done'
        ],
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

    this.workspaceBarChartData = {
  labels: [
    'Backlog / To Do',
    'Ready for Dev',
    'Dev in Progress',
    'Ready for Testing',
    'Ready for UAT',
    'Done'
  ],
  datasets: [
    {
      label: this.selectedWorkspaceChart.name,
      data: [
        this.selectedWorkspaceChart.todoCount,
        this.selectedWorkspaceChart.readyForDevelopmentCount,
        this.selectedWorkspaceChart.devInProgressCount,
        this.selectedWorkspaceChart.readyForTestingCount,
        this.selectedWorkspaceChart.readyForUatCount,
        this.selectedWorkspaceChart.doneCount
      ],
      backgroundColor: [
        this.monochromePalette.todo,
        this.monochromePalette.readyForDevelopment,
        this.monochromePalette.devInProgress,
        this.monochromePalette.readyForTesting,
        this.monochromePalette.readyForUat,
        this.monochromePalette.done
      ],
      borderColor: '#ffffff',
      borderWidth: 2,
      borderSkipped: false,

      barPercentage: 0.45,
      categoryPercentage: 0.5,
      maxBarThickness: 52
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
      todo_tickets: allTickets.filter(ticket => ticket.status === 'todo').length,

      ready_for_development_tickets: allTickets.filter(
        ticket => ticket.status === 'ready_for_development'
      ).length,

      dev_in_progress_tickets: allTickets.filter(
        ticket => ticket.status === 'dev_in_progress'
      ).length,

      ready_for_testing_tickets: allTickets.filter(
        ticket => ticket.status === 'ready_for_testing'
      ).length,

      ready_for_uat_tickets: allTickets.filter(
        ticket => ticket.status === 'ready_for_uat'
      ).length,

      done_tickets: allTickets.filter(ticket => ticket.status === 'done').length,
      urgent_tickets: allTickets.filter(ticket => ticket.priority === 'urgent').length,
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
    if (ticket.status === 'done') {
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

  getStatusLabel(status: TicketStatus): string {
    const labels: Record<TicketStatus, string> = {
      todo: 'To Do / Backlog',
      ready_for_development: 'Ready for Development',
      dev_in_progress: 'Dev in Progress',
      ready_for_testing: 'Ready for Testing',
      ready_for_uat: 'Ready for UAT',
      done: 'Done'
    };

    return labels[status] || status;
  }

  getPriorityLabel(priority: TicketPriority): string {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }

  openWorkspaceBoard(workspaceId: number): void {
    this.router.navigate(['/workspaces', workspaceId, 'board']);
  }

  openWorkspaceBacklog(workspaceId: number): void {
    this.router.navigate(['/workspaces', workspaceId, 'backlog']);
  }

  openWorkspaceActivity(workspaceId: number): void {
    this.router.navigate(['/workspaces', workspaceId, 'activity']);
  }

  goToWorkspaces(): void {
    this.router.navigate(['/workspaces']);
  }
}