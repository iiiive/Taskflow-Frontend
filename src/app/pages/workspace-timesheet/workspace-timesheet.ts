import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AppSidebar } from '../../components/app-sidebar/app-sidebar';

import {
  ApiResponse,
  Workspace
} from '../../interfaces/planora.interface';

interface TimesheetLogUser {
  id: number;
  name?: string | null;
  email?: string | null;
}

interface TimesheetLogTicket {
  id: number;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
}

interface TimesheetLog {
  id: number;
  workspace_id: number;
  ticket_id: number;
  user_id: number;
  hours: number;
  description?: string | null;
  work_date: string;
  created_at?: string | null;
  updated_at?: string | null;
  user?: TimesheetLogUser | null;
  ticket?: TimesheetLogTicket | null;
}

interface TimesheetUserGroup {
  user_id: number;
  user_name: string;
  total_hours: number;
  logs: TimesheetLog[];
}

interface TimesheetDayGroup {
  date: string;
  total_hours: number;
  users: TimesheetUserGroup[];
}

interface TimesheetUserOption {
  id: number;
  name: string;
}

interface TimesheetDayColumn {
  date: string;
  dayNumber: number;
  dayName: string;
  monthLabel: string;
}

interface TimesheetTicketRow {
  ticketId: number;
  ticketTitle: string;
  status: string;
  priority: string;
  dayHours: Record<string, number>;
  totalHours: number;
}

@Component({
  selector: 'app-workspace-timesheet',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebar],
  templateUrl: './workspace-timesheet.html',
  styleUrl: './workspace-timesheet.scss'
})
export class WorkspaceTimesheet implements OnInit {
  apiUrl = 'http://127.0.0.1:8000/api';

  workspaceId!: number;
  workspace: Workspace | null = null;

  loadingWorkspace = true;
  loadingTimesheet = true;

  errorMessage = '';

  totalHours = 0;
  timesheetDays: TimesheetDayGroup[] = [];

  selectedUserId: number | null = null;
  selectedMonth = this.getCurrentMonth();

  requiredDailyHours = 8;

  userOptions: TimesheetUserOption[] = [];
  dayColumns: TimesheetDayColumn[] = [];
  ticketRows: TimesheetTicketRow[] = [];

  dailyTotals: Record<string, number> = {};
  dailyBalance: Record<string, number> = {};

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
    this.loadTimesheet();
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

  loadTimesheet(): void {
    this.loadingTimesheet = true;
    this.errorMessage = '';

    const monthRange = this.getMonthRange(this.selectedMonth);

    let params = new HttpParams()
      .set('from', monthRange.from)
      .set('to', monthRange.to);

    if (this.selectedUserId) {
      params = params.set('user_id', String(this.selectedUserId));
    }

    this.http.get<any>(
      `${this.apiUrl}/workspaces/${this.workspaceId}/timesheet`,
      { params }
    ).subscribe({
      next: (res) => {
        this.totalHours = Number(res?.total_hours || 0);
        this.timesheetDays = Array.isArray(res?.data) ? res.data : [];

        this.buildTimesheetTable();

        this.loadingTimesheet = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Load workspace timesheet error:', err);

        this.totalHours = 0;
        this.timesheetDays = [];
        this.dayColumns = [];
        this.ticketRows = [];
        this.dailyTotals = {};
        this.dailyBalance = {};
        this.loadingTimesheet = false;
        this.errorMessage =
          err?.error?.message ||
          'Unable to load workspace timesheet.';

        this.cdr.detectChanges();
      }
    });
  }

  buildTimesheetTable(): void {
    this.dayColumns = this.buildMonthColumns(this.selectedMonth);

    const allLogs = this.flattenLogs(this.timesheetDays);

    this.userOptions = this.buildUserOptions(allLogs);

    const ticketMap = new Map<number, TimesheetTicketRow>();

    for (const log of allLogs) {
      const ticketId = Number(log.ticket_id);
      const workDate = log.work_date;
      const hours = Number(log.hours || 0);

      if (!ticketMap.has(ticketId)) {
        ticketMap.set(ticketId, {
          ticketId,
          ticketTitle: log.ticket?.title || `Ticket #${ticketId}`,
          status: log.ticket?.status || '—',
          priority: log.ticket?.priority || '—',
          dayHours: {},
          totalHours: 0
        });
      }

      const row = ticketMap.get(ticketId)!;

      row.dayHours[workDate] = Number(row.dayHours[workDate] || 0) + hours;
      row.totalHours += hours;
    }

    this.ticketRows = Array.from(ticketMap.values())
      .sort((a, b) => a.ticketTitle.localeCompare(b.ticketTitle));

    this.buildDailyTotals();
  }

  buildDailyTotals(): void {
    const totals: Record<string, number> = {};
    const balance: Record<string, number> = {};

    for (const day of this.dayColumns) {
      totals[day.date] = 0;
    }

    for (const row of this.ticketRows) {
      for (const day of this.dayColumns) {
        totals[day.date] += Number(row.dayHours[day.date] || 0);
      }
    }

    for (const day of this.dayColumns) {
      balance[day.date] = Number(totals[day.date] || 0) - Number(this.requiredDailyHours || 0);
    }

    this.dailyTotals = totals;
    this.dailyBalance = balance;
  }

  flattenLogs(days: TimesheetDayGroup[]): TimesheetLog[] {
    const logs: TimesheetLog[] = [];

    for (const day of days) {
      for (const userGroup of day.users || []) {
        for (const log of userGroup.logs || []) {
          logs.push(log);
        }
      }
    }

    return logs;
  }

  buildUserOptions(logs: TimesheetLog[]): TimesheetUserOption[] {
    const userMap = new Map<number, TimesheetUserOption>();

    for (const log of logs) {
      const userId = Number(log.user_id);

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          id: userId,
          name: log.user?.name || log.user?.email || `User #${userId}`
        });
      }
    }

    return Array.from(userMap.values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  buildMonthColumns(monthValue: string): TimesheetDayColumn[] {
    const [year, month] = monthValue.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const columns: TimesheetDayColumn[] = [];

    for (let day = 1; day <= lastDay; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const currentDate = new Date(year, month - 1, day);

      columns.push({
        date,
        dayNumber: day,
        dayName: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
        monthLabel: currentDate.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric'
        })
      });
    }

    return columns;
  }

  getMonthRange(monthValue: string): { from: string; to: string } {
    const [year, month] = monthValue.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();

    return {
      from: `${year}-${String(month).padStart(2, '0')}-01`,
      to: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    };
  }

  getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    return `${year}-${month}`;
  }

  onMonthChanged(): void {
    this.loadTimesheet();
  }

  onUserChanged(): void {
    this.loadTimesheet();
  }

  onRequiredHoursChanged(): void {
    if (!this.requiredDailyHours || this.requiredDailyHours < 0) {
      this.requiredDailyHours = 0;
    }

    this.buildDailyTotals();
  }

  clearFilters(): void {
    this.selectedUserId = null;
    this.selectedMonth = this.getCurrentMonth();
    this.requiredDailyHours = 8;

    this.loadTimesheet();
  }

  getDayHours(row: TimesheetTicketRow, date: string): number {
    return Number(row.dayHours[date] || 0);
  }

  hasDayHours(row: TimesheetTicketRow, date: string): boolean {
    return this.getDayHours(row, date) > 0;
  }

  getDailyTotal(date: string): number {
    return Number(this.dailyTotals[date] || 0);
  }

  getDailyBalance(date: string): number {
    return Number(this.dailyBalance[date] || 0);
  }

  getDailyStatus(date: string): 'empty' | 'short' | 'complete' | 'overtime' {
    const total = this.getDailyTotal(date);

    if (total === 0) {
      return 'empty';
    }

    if (total < this.requiredDailyHours) {
      return 'short';
    }

    if (total === this.requiredDailyHours) {
      return 'complete';
    }

    return 'overtime';
  }

  getDailyStatusLabel(date: string): string {
    const status = this.getDailyStatus(date);

    if (status === 'empty') {
      return '—';
    }

    if (status === 'short') {
      return 'Short';
    }

    if (status === 'complete') {
      return 'Complete';
    }

    return 'Overtime';
  }

  getDailyStatusClass(date: string): string {
    return `daily-status-${this.getDailyStatus(date)}`;
  }

  getSelectedMonthLabel(): string {
    if (!this.selectedMonth) {
      return 'Timesheet';
    }

    const [year, month] = this.selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);

    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  }

  getSelectedUserLabel(): string {
    if (!this.selectedUserId) {
      return 'All Users';
    }

    const user = this.userOptions.find(item => item.id === Number(this.selectedUserId));

    return user?.name || `User #${this.selectedUserId}`;
  }

  getMonthlyRequiredHours(): number {
    return this.dayColumns.length * Number(this.requiredDailyHours || 0);
  }

  getMonthlyBalance(): number {
    return Number(this.totalHours || 0) - this.getMonthlyRequiredHours();
  }

  extractSingle<T>(res: ApiResponse<T> | T | any): T {
    if (res?.data) {
      return res.data as T;
    }

    return res as T;
  }

  formatHours(hours: number | string | null | undefined): string {
    const value = Number(hours || 0);

    if (value === 0) {
      return '—';
    }

    if (Number.isInteger(value)) {
      return `${value}`;
    }

    return value.toFixed(2).replace(/\.?0+$/, '');
  }

  formatHoursWithLabel(hours: number | string | null | undefined): string {
    const value = Number(hours || 0);

    if (Number.isInteger(value)) {
      return `${value} hr${value === 1 ? '' : 's'}`;
    }

    return `${value.toFixed(2).replace(/\.?0+$/, '')} hrs`;
  }

  formatSignedHours(hours: number | string | null | undefined): string {
    const value = Number(hours || 0);

    if (value === 0) {
      return '0';
    }

    const sign = value > 0 ? '+' : '-';
    const absoluteValue = Math.abs(value);

    if (Number.isInteger(absoluteValue)) {
      return `${sign}${absoluteValue}`;
    }

    return `${sign}${absoluteValue.toFixed(2).replace(/\.?0+$/, '')}`;
  }

  formatStatus(status: string | null | undefined): string {
    const labels: Record<string, string> = {
      todo: 'To Do',
      ready_for_development: 'Ready for Development',
      dev_in_progress: 'Dev in Progress',
      ready_for_testing: 'Ready for Testing',
      ready_for_uat: 'Ready for UAT',
      done: 'Done',
      completed: 'Archived'
    };

    return status ? labels[status] || status : '—';
  }

  formatPriority(priority: string | null | undefined): string {
    if (!priority || priority === '—') {
      return '—';
    }

    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }

  goBackToBoard(): void {
    this.router.navigate(['/workspaces', this.workspaceId, 'board']);
  }

  goBackToBacklog(): void {
    this.router.navigate(['/workspaces', this.workspaceId, 'backlog']);
  }

  goToActivity(): void {
    this.router.navigate(['/workspaces', this.workspaceId, 'activity']);
  }

  goToArchive(): void {
    this.router.navigate(['/workspaces', this.workspaceId, 'archive']);
  }
}