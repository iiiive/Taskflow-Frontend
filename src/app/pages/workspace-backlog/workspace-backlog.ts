import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

import { TicketModal } from '../../components/ticket-modal/ticket-modal';
import { ToastService } from '../../services/toast/toast.service';

import {
  ApiResponse,
  Ticket,
  TicketPriority,
  TicketStatus,
  Workspace,
  WorkspaceMember
} from '../../interfaces/planora.interface';

import { WorkspaceTabs } from '../../components/workspace-tabs/workspace-tabs';

@Component({
  selector: 'app-workspace-backlog',
  standalone: true,
  imports: [WorkspaceTabs, CommonModule, FormsModule, TicketModal],
  templateUrl: './workspace-backlog.html',
  styleUrl: './workspace-backlog.scss'
})
export class WorkspaceBacklog implements OnInit {
  apiUrl = environment.apiUrl;

  workspaceId!: number;
  workspace: Workspace | null = null;
  workspaceMembers: WorkspaceMember[] = [];

  tickets: Ticket[] = [];

  // Scrum sprints available to pull backlog items into (planning + active).
  sprints: any[] = [];
  selectedSprintByTicket: Record<number, number | ''> = {};
  assigningTicketId: number | null = null;

  loadingWorkspace = true;
  loadingTickets = true;
  loadingMembers = false;

  creating = false;
  showCreateModal = false;
  showTicketDetailsModal = false;

  selectedTicket: Ticket | null = null;

  errorMessage = '';
  successMessage = '';

  search = '';
  selectedPriority = '';

  newTicket = {
    title: '',
    description: '',
    status: 'todo' as TicketStatus,
    priority: 'medium' as TicketPriority,
    due_date: '',
    assigned_to: null as number | null
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.workspaceId = Number(this.route.snapshot.paramMap.get('id'));

    if (!this.workspaceId) {
      this.router.navigate(['/projects']);
      return;
    }

    this.loadWorkspace();
    this.loadWorkspaceMembers();
    this.loadSprints();
    this.loadBacklogTickets();
  }

  loadSprints(): void {
    this.http.get<any>(
      `${this.apiUrl}/projects/${this.workspaceId}/sprints`
    ).subscribe({
      next: (res) => {
        // Only sprints you can still add work to (not completed).
        this.sprints = this.extractArray<any>(res)
          .filter(s => s.status !== 'completed');
        this.cdr.detectChanges();
      },
      error: () => {
        this.sprints = [];
      }
    });
  }

  addToSprint(ticket: Ticket): void {
    const sprintId = this.selectedSprintByTicket[ticket.id];

    if (!sprintId) {
      this.toast.error('Choose a sprint first.');
      return;
    }

    this.assigningTicketId = ticket.id;

    this.http.post<any>(
      `${this.apiUrl}/tickets/${ticket.id}/sprint`,
      { sprint_id: sprintId }
    ).subscribe({
      next: () => {
        // Pulled into a sprint → leaves the backlog.
        this.tickets = this.tickets.filter(item => item.id !== ticket.id);
        this.assigningTicketId = null;
        const sprint = this.sprints.find(s => Number(s.id) === Number(sprintId));
        this.toast.success(`"${ticket.title}" added to ${sprint?.name || 'sprint'}.`);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.assigningTicketId = null;
        this.toast.error(err?.error?.message || 'Unable to add ticket to sprint.');
        this.cdr.detectChanges();
      }
    });
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
    this.loadingMembers = true;

    this.http.get<any>(
      `${this.apiUrl}/projects/${this.workspaceId}/members`
    ).subscribe({
      next: (res) => {
        this.workspaceMembers = this.extractArray<WorkspaceMember>(res);
        this.loadingMembers = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.workspaceMembers = [];
        this.loadingMembers = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadBacklogTickets(): void {
    this.loadingTickets = true;
    this.errorMessage = '';

    // Backlog = tickets not yet pulled into any sprint.
    let params = new HttpParams().set('backlog', '1');

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
        console.error('Load backlog tickets error:', err);
        this.loadingTickets = false;
        this.errorMessage = err?.error?.message || 'Unable to load backlog tickets.';
        this.cdr.detectChanges();
      }
    });
  }

  openCreateModal(): void {
    this.showCreateModal = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.newTicket = {
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      due_date: '',
      assigned_to: null
    };

    this.cdr.detectChanges();
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.creating = false;
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  createTicket(): void {
    if (!this.newTicket.title.trim()) {
      this.errorMessage = 'Ticket title is required.';
      this.cdr.detectChanges();
      return;
    }

    const payload = {
      title: this.newTicket.title.trim(),
      description: this.newTicket.description.trim(),
      status: 'todo',
      priority: this.newTicket.priority,
      due_date: this.newTicket.due_date || null,
      assigned_to: this.newTicket.assigned_to
    };

    this.creating = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.http.post<any>(
      `${this.apiUrl}/projects/${this.workspaceId}/tickets`,
      payload
    ).subscribe({
      next: (res) => {
        const createdTicket = res?.data ? res.data : res;
        this.tickets = [createdTicket, ...this.tickets];

        this.creating = false;
        this.showCreateModal = false;
        this.toast.success('Ticket added to backlog.');

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Create backlog ticket error:', err);
        this.creating = false;
        this.errorMessage = err?.error?.message || 'Unable to create ticket.';
        this.cdr.detectChanges();
      }
    });
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
    // A backlog item leaves the list only once it belongs to a sprint.
    if ((updatedTicket as any).sprint_id) {
      this.tickets = this.tickets.filter(ticket => ticket.id !== updatedTicket.id);
      this.closeTicketDetails();
      this.toast.success('Ticket updated and moved to a sprint.');
      this.cdr.detectChanges();
      return;
    }

    this.tickets = this.tickets.map(ticket =>
      ticket.id === updatedTicket.id ? updatedTicket : ticket
    );

    this.selectedTicket = updatedTicket;
    this.toast.success('Ticket updated successfully.');
    this.cdr.detectChanges();
  }

  moveToDevelopment(ticket: Ticket): void {
    const oldStatus = ticket.status;
    ticket.status = 'ready_for_development';

    const payload = {
      title: ticket.title,
      description: ticket.description || '',
      status: 'ready_for_development',
      priority: ticket.priority,
      assigned_to: ticket.assigned_to,
      due_date: ticket.due_date
    };

    this.http.put<any>(`${this.apiUrl}/tickets/${ticket.id}`, payload).subscribe({
      next: (res) => {
        const updatedTicket = res?.data ? res.data : res;

        this.tickets = this.tickets.filter(item => item.id !== ticket.id);

        if (this.selectedTicket?.id === ticket.id) {
          this.selectedTicket = updatedTicket;
          this.closeTicketDetails();
        }

        this.successMessage = 'Ticket moved to board.';
        this.errorMessage = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Move ticket to development error:', err);
        ticket.status = oldStatus;
        this.errorMessage = err?.error?.message || 'Unable to move ticket to board.';
        this.cdr.detectChanges();
      }
    });
  }

  deleteTicket(ticket: Ticket): void {
    const confirmed = confirm(`Delete ticket "${ticket.title}"?`);

    if (!confirmed) {
      return;
    }

    this.http.delete<any>(`${this.apiUrl}/tickets/${ticket.id}`).subscribe({
      next: () => {
        this.tickets = this.tickets.filter(item => item.id !== ticket.id);

        if (this.selectedTicket?.id === ticket.id) {
          this.closeTicketDetails();
        }

        this.toast.success('Ticket deleted successfully.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Delete ticket error:', err);
        this.toast.error(err?.error?.message || 'Unable to delete ticket.');
        this.cdr.detectChanges();
      }
    });
  }

  canEditTicket(): boolean {
    return this.workspace?.role === 'owner'
      || this.workspace?.role === 'editor'
      || (this.workspace as any)?.can_edit === true;
  }

  canCommentTicket(): boolean {
    return this.canEditTicket();
  }

  goToBoard(): void {
    this.router.navigate(['/projects', this.workspaceId, 'board']);
  }

  goBackToWorkspaces(): void {
    this.router.navigate(['/projects']);
  }

  getPlainText(html: string | null | undefined): string {
    if (!html) return '';

    const div = document.createElement('div');
    div.innerHTML = html;

    return div.textContent || div.innerText || '';
  }

  getPriorityClass(priority: string): string {
    return `priority-${priority}`;
  }

  goToActivityLog(): void {
  this.router.navigate(['/projects', this.workspaceId, 'activity']);
}

  getPersonName(person: any): string {
    if (!person) return 'Unassigned';
    return person.name || person.email || 'Unknown user';
  }

  goToArchive(): void {
  this.router.navigate(['/projects', this.workspaceId, 'archive']);
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