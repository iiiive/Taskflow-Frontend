import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

import { TicketModal } from '../../components/ticket-modal/ticket-modal';

import {
  ApiResponse,
  Ticket,
  Workspace,
  WorkspaceMember
} from '../../interfaces/planora.interface';

import { WorkspaceTabs } from '../../components/workspace-tabs/workspace-tabs';

@Component({
  selector: 'app-workspace-archive',
  standalone: true,
  imports: [WorkspaceTabs, CommonModule, FormsModule, TicketModal],
  templateUrl: './workspace-archive.html',
  styleUrl: './workspace-archive.scss',
})
export class WorkspaceArchive implements OnInit {
  apiUrl = environment.apiUrl;

  workspaceId!: number;
  workspace: Workspace | null = null;
  workspaceMembers: WorkspaceMember[] = [];
  tickets: Ticket[] = [];

  loadingWorkspace = true;
  loadingTickets = true;

  errorMessage = '';
  successMessage = '';

  search = '';
  selectedPriority = '';

  selectedTicket: Ticket | null = null;
  showTicketDetailsModal = false;

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
    this.loadWorkspaceMembers();
    this.loadArchivedTickets();
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
        this.errorMessage = err?.error?.message || 'Unable to load workspace.';
        this.cdr.detectChanges();
      }
    });
  }

  loadWorkspaceMembers(): void {
    this.http.get<any>(
      `${this.apiUrl}/projects/${this.workspaceId}/members`
    ).subscribe({
      next: (res) => {
        this.workspaceMembers = this.extractArray<WorkspaceMember>(res);
        this.cdr.detectChanges();
      },
      error: () => {
        this.workspaceMembers = [];
        this.cdr.detectChanges();
      }
    });
  }

  loadArchivedTickets(): void {
    this.loadingTickets = true;
    this.errorMessage = '';

    let params = new HttpParams().set('status', 'completed');

    if (this.search.trim()) {
      params = params.set('search', this.search.trim());
    }

    if (this.selectedPriority) {
      params = params.set('priority', this.selectedPriority);
    }

    this.http.get<ApiResponse<Ticket[]> | Ticket[]>(
      `${this.apiUrl}/projects/${this.workspaceId}/tickets`,
      { params }
    ).subscribe({
      next: (res) => {
        this.tickets = this.extractArray<Ticket>(res);
        this.loadingTickets = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Load archived tickets error:', err);
        this.loadingTickets = false;
        this.errorMessage = err?.error?.message || 'Unable to load archived tickets.';
        this.cdr.detectChanges();
      }
    });
  }

  canEditTicket(): boolean {
    return this.workspace?.role === 'owner' || this.workspace?.role === 'editor';
  }

  canCommentTicket(): boolean {
    return this.workspace?.role === 'owner' || this.workspace?.role === 'editor';
  }

  openTicketDetails(ticket: Ticket): void {
    this.selectedTicket = ticket;
    this.showTicketDetailsModal = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();
  }

  closeTicketDetails(): void {
    this.showTicketDetailsModal = false;
    this.selectedTicket = null;
    this.cdr.detectChanges();
  }

  handleTicketUpdated(updatedTicket: Ticket): void {
    if (updatedTicket.status !== 'completed') {
      this.tickets = this.tickets.filter(ticket => ticket.id !== updatedTicket.id);
      this.closeTicketDetails();
      this.successMessage = 'Ticket removed from archive.';
      this.cdr.detectChanges();
      return;
    }

    this.tickets = this.tickets.map(ticket =>
      ticket.id === updatedTicket.id ? updatedTicket : ticket
    );

    this.selectedTicket = updatedTicket;
    this.cdr.detectChanges();
  }

  getPlainText(html: string | null | undefined): string {
    if (!html) return '';

    const div = document.createElement('div');
    div.innerHTML = html;

    return div.textContent || div.innerText || '';
  }

  getPersonName(person: any): string {
    if (!person) {
      return 'Unassigned';
    }

    return person.name || person.email || 'Unknown User';
  }

  getPriorityClass(priority: string): string {
    return `priority-${priority}`;
  }

  goToBacklog(): void {
    this.router.navigate(['/projects', this.workspaceId, 'backlog']);
  }

  goToBoard(): void {
    this.router.navigate(['/projects', this.workspaceId, 'board']);
  }

  goToActivityLog(): void {
    this.router.navigate(['/projects', this.workspaceId, 'activity']);
  }

  extractSingle<T>(res: ApiResponse<T> | T | any): T {
    return res?.data ? res.data as T : res as T;
  }

  extractArray<T>(res: ApiResponse<T[]> | T[] | any): T[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.data?.data)) return res.data.data;
    if (Array.isArray(res?.tickets)) return res.tickets;
    if (Array.isArray(res?.members)) return res.members;
    if (Array.isArray(res?.data?.members)) return res.data.members;
    if (Array.isArray(res?.workspace_members)) return res.workspace_members;
    if (Array.isArray(res?.data?.workspace_members)) return res.data.workspace_members;

    return [];
  }

  goToTimesheet(): void {
  this.router.navigate(['/projects', this.workspaceId, 'timesheet']);
}

}