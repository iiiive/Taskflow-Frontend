import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';

type TicketStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

interface Workspace {
  id: number;
  name: string;
  description?: string | null;
  role?: 'owner' | 'editor' | 'viewer';
}

interface WorkspaceMember {
  id: number;
  user_id: number;
  workspace_id?: number;
  role: 'owner' | 'editor' | 'viewer';
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

interface Ticket {
  id: number;
  workspace_id: number;
  created_by?: number;
  assigned_to?: number | null;
  title: string;
  description?: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  due_date?: string | null;
  due_date_warning?: string | null;
  suggested_priority?: string | null;
  assignee?: any;
  creator?: any;
  created_at?: string;
  updated_at?: string;
}

interface TicketComment {
  id: number;
  ticket_id: number;
  user_id: number;
  comment: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'app-workspace-board',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './workspace-board.html',
  styleUrl: './workspace-board.scss',
})
export class WorkspaceBoard implements OnInit {
  userName = 'User';

  workspaceId!: number;
  workspace: Workspace | null = null;

  workspaceMembers: WorkspaceMember[] = [];
  tickets: Ticket[] = [];
  ticketComments: TicketComment[] = [];

  ticketActivityLogs: any[] = [];
  loadingActivityLogs = false;
  activityLogError = '';

  loadingWorkspace = true;
  loadingTickets = true;
  loadingMembers = false;
  loadingComments = false;

  creating = false;
  savingTicket = false;
  sendingComment = false;

  errorMessage = '';
  successMessage = '';

  search = '';
  selectedPriority = '';
  selectedStatus = '';

  showCreateModal = false;
  showTicketDetailsModal = false;

  selectedTicket: Ticket | null = null;
  draggedTicket: Ticket | null = null;

  editingTicket = false;

  commentText = '';

  newTicket = {
    title: '',
    description: '',
    status: 'backlog' as TicketStatus,
    priority: 'medium' as TicketPriority,
    due_date: '',
    assigned_to: null as number | null
  };

  editTicketData = {
    title: '',
    description: '',
    status: 'backlog' as TicketStatus,
    priority: 'medium' as TicketPriority,
    due_date: '',
    assigned_to: null as number | null
  };

  columns: { label: string; value: TicketStatus; description: string }[] = [
    {
      label: 'Backlog',
      value: 'backlog',
      description: 'Not yet part of the sprint'
    },
    {
      label: 'To Do',
      value: 'todo',
      description: 'Ready for work'
    },
    {
      label: 'In Progress',
      value: 'in_progress',
      description: 'Currently being worked on'
    },
    {
      label: 'In Review',
      value: 'in_review',
      description: 'Waiting for review'
    },
    {
      label: 'Done',
      value: 'done',
      description: 'Completed work'
    }
  ];

  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUser();

    this.workspaceId = Number(this.route.snapshot.paramMap.get('id'));

    if (!this.workspaceId) {
      this.router.navigate(['/workspaces']);
      return;
    }

    this.loadWorkspace();
    this.loadTickets();
    this.loadWorkspaceMembers();
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

  loadTicketActivityLogs(ticketId: number): void {
    this.loadingActivityLogs = true;
    this.activityLogError = '';

    this.http.get<any>(`${this.apiUrl}/tickets/${ticketId}/activity`).subscribe({
      next: (response) => {
        this.ticketActivityLogs = response.data || [];
        this.loadingActivityLogs = false;
      },
      error: (error) => {
        console.error(error);
        this.activityLogError = 'Failed to load activity logs.';
        this.loadingActivityLogs = false;
      }
    });
  }

  loadWorkspace(): void {
    this.loadingWorkspace = true;

    this.http.get<any>(`${this.apiUrl}/workspaces/${this.workspaceId}`).subscribe({
      next: (res) => {
        this.workspace = res?.data ? res.data : res;
        this.loadingWorkspace = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Load workspace error:', err);

        this.loadingWorkspace = false;
        this.errorMessage =
          err?.error?.message ||
          'Unable to load workspace details.';

        this.cdr.detectChanges();
      }
    });
  }

  loadWorkspaceMembers(): void {
    this.loadingMembers = true;

    this.http.get<any>(`${this.apiUrl}/workspaces/${this.workspaceId}/members`).subscribe({
      next: (res) => {
        console.log('Workspace members API response:', res);

        this.workspaceMembers = this.extractWorkspaceMembers(res);

        console.log('Extracted workspace members:', this.workspaceMembers);

        this.loadingMembers = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Load workspace members error:', err);

        this.workspaceMembers = [];
        this.loadingMembers = false;
        this.cdr.detectChanges();
      }
    });
  }

  extractWorkspaceMembers(res: any): WorkspaceMember[] {
    if (Array.isArray(res)) {
      return res;
    }

    if (Array.isArray(res?.data)) {
      return res.data;
    }

    if (Array.isArray(res?.data?.data)) {
      return res.data.data;
    }

    if (Array.isArray(res?.members)) {
      return res.members;
    }

    if (Array.isArray(res?.data?.members)) {
      return res.data.members;
    }

    if (Array.isArray(res?.workspace_members)) {
      return res.workspace_members;
    }

    if (Array.isArray(res?.data?.workspace_members)) {
      return res.data.workspace_members;
    }

    return [];
  }

  loadTickets(): void {
    this.loadingTickets = true;
    this.errorMessage = '';

    let params = new HttpParams();

    if (this.search.trim()) {
      params = params.set('search', this.search.trim());
    }

    if (this.selectedPriority) {
      params = params.set('priority', this.selectedPriority);
    }

    if (this.selectedStatus) {
      params = params.set('status', this.selectedStatus);
    }

    this.http
      .get<any>(`${this.apiUrl}/workspaces/${this.workspaceId}/tickets`, { params })
      .subscribe({
        next: (res) => {
          this.tickets = this.extractTicketArray(res);
          this.loadingTickets = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Load tickets error:', err);

          this.loadingTickets = false;
          this.errorMessage =
            err?.error?.message ||
            'Unable to load tickets. Please try again.';

          this.cdr.detectChanges();
        }
      });
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

    return [];
  }

  getTicketsByStatus(status: TicketStatus): Ticket[] {
    return this.tickets.filter(ticket => ticket.status === status);
  }

  canEditTicket(): boolean {
    return this.workspace?.role === 'owner' || this.workspace?.role === 'editor';
  }

  canCommentTicket(): boolean {
    return this.workspace?.role === 'owner' || this.workspace?.role === 'editor';
  }

  openCreateModal(status: TicketStatus = 'backlog'): void {
    this.showCreateModal = true;

    this.newTicket = {
      title: '',
      description: '',
      status,
      priority: 'medium',
      due_date: '',
      assigned_to: null
    };

    this.errorMessage = '';
    this.successMessage = '';

    this.cdr.detectChanges();
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.creating = false;
    this.errorMessage = '';

    this.newTicket = {
      title: '',
      description: '',
      status: 'backlog',
      priority: 'medium',
      due_date: '',
      assigned_to: null
    };

    this.cdr.detectChanges();
  }

  createTicket(): void {
    if (!this.newTicket.title.trim()) {
      this.errorMessage = 'Ticket title is required.';
      this.cdr.detectChanges();
      return;
    }

    this.creating = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      title: this.newTicket.title.trim(),
      description: this.newTicket.description.trim(),
      status: this.newTicket.status,
      priority: this.newTicket.priority,
      due_date: this.newTicket.due_date || null,
      assigned_to: this.newTicket.assigned_to
    };

    this.http
      .post<any>(`${this.apiUrl}/workspaces/${this.workspaceId}/tickets`, payload)
      .subscribe({
        next: (res) => {
          const createdTicket = res?.data ? res.data : res;

          this.tickets = [createdTicket, ...this.tickets];

          this.creating = false;
          this.showCreateModal = false;
          this.successMessage = 'Ticket created successfully.';

          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Create ticket error:', err);

          this.creating = false;
          this.errorMessage =
            err?.error?.message ||
            'Unable to create ticket. Please check your input.';

          this.cdr.detectChanges();
        }
      });
  }

  changeTicketStatus(ticket: Ticket, newStatus: TicketStatus): void {
    const oldStatus = ticket.status;

    ticket.status = newStatus;
    this.cdr.detectChanges();

    const payload = {
      title: ticket.title,
      description: ticket.description,
      status: newStatus,
      priority: ticket.priority,
      assigned_to: ticket.assigned_to,
      due_date: ticket.due_date
    };

    this.http.put<any>(`${this.apiUrl}/tickets/${ticket.id}`, payload).subscribe({
      next: (res) => {
        const updatedTicket = res?.data ? res.data : res;

        this.tickets = this.tickets.map(item =>
          item.id === ticket.id ? updatedTicket : item
        );

        if (this.selectedTicket?.id === ticket.id) {
          this.selectedTicket = updatedTicket;
        }

        this.successMessage = 'Ticket status updated.';
        this.errorMessage = '';

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Update ticket status error:', err);

        ticket.status = oldStatus;

        this.errorMessage =
          err?.error?.message ||
          'Unable to update ticket status.';

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

        this.successMessage = 'Ticket deleted successfully.';
        this.errorMessage = '';

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Delete ticket error:', err);

        this.errorMessage =
          err?.error?.message ||
          'Unable to delete ticket.';

        this.cdr.detectChanges();
      }
    });
  }

  onDragStart(ticket: Ticket): void {
    this.draggedTicket = ticket;
  }

  onDragEnd(): void {
    this.draggedTicket = null;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(status: TicketStatus): void {
    if (!this.draggedTicket) {
      return;
    }

    if (this.draggedTicket.status === status) {
      this.draggedTicket = null;
      return;
    }

    this.changeTicketStatus(this.draggedTicket, status);
    this.draggedTicket = null;
  }

  openTicketDetails(ticket: Ticket): void {
    this.selectedTicket = ticket;
    this.showTicketDetailsModal = true;
    this.editingTicket = false;
    this.commentText = '';

    this.editTicketData = {
      title: ticket.title || '',
      description: ticket.description || '',
      status: ticket.status,
      priority: ticket.priority,
      due_date: ticket.due_date || '',
      assigned_to: ticket.assigned_to ?? null
    };

    this.loadTicketComments(ticket.id);
    this.loadTicketActivityLogs(ticket.id);

    this.cdr.detectChanges();
  }

  closeTicketDetails(): void {
    this.selectedTicket = null;
    this.showTicketDetailsModal = false;
    this.editingTicket = false;
    this.errorMessage = '';

    this.ticketComments = [];
    this.commentText = '';

    this.cdr.detectChanges();
  }

  startEditingTicket(): void {
    if (!this.canEditTicket() || !this.selectedTicket) {
      return;
    }

    this.editingTicket = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.cdr.detectChanges();
  }

  cancelEditingTicket(): void {
    if (!this.selectedTicket) {
      return;
    }

    this.editingTicket = false;

    this.editTicketData = {
      title: this.selectedTicket.title || '',
      description: this.selectedTicket.description || '',
      status: this.selectedTicket.status,
      priority: this.selectedTicket.priority,
      due_date: this.selectedTicket.due_date || '',
      assigned_to: this.selectedTicket.assigned_to ?? null
    };

    this.cdr.detectChanges();
  }

  saveTicketChanges(): void {
    if (!this.selectedTicket) {
      return;
    }

    if (!this.editTicketData.title.trim()) {
      this.errorMessage = 'Ticket title is required.';
      this.cdr.detectChanges();
      return;
    }

    this.savingTicket = true;
    this.errorMessage = '';
    this.successMessage = '';

    const ticketId = this.selectedTicket.id;

    const payload = {
      title: this.editTicketData.title.trim(),
      description: this.editTicketData.description.trim(),
      status: this.editTicketData.status,
      priority: this.editTicketData.priority,
      due_date: this.editTicketData.due_date || null,
      assigned_to: this.editTicketData.assigned_to
    };

    this.http.put<any>(`${this.apiUrl}/tickets/${ticketId}`, payload).subscribe({
      next: (res) => {
        const updatedTicket = res?.data ? res.data : res;

        this.loadTicketActivityLogs(ticketId);

        this.tickets = this.tickets.map(ticket =>
          ticket.id === ticketId ? updatedTicket : ticket
        );

        this.selectedTicket = updatedTicket;
        this.editingTicket = false;
        this.savingTicket = false;
        this.successMessage = 'Ticket updated successfully.';
        this.errorMessage = '';

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Update ticket error:', err);

        this.savingTicket = false;
        this.errorMessage =
          err?.error?.message ||
          'Unable to update ticket. You may not have permission.';

        this.cdr.detectChanges();
      }
    });
  }

  loadTicketComments(ticketId: number): void {
    this.loadingComments = true;

    this.http.get<any>(`${this.apiUrl}/tickets/${ticketId}/comments`).subscribe({
      next: (res) => {
        this.ticketComments = this.extractTicketComments(res);
        this.loadingComments = false;

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Load ticket comments error:', err);

        this.ticketComments = [];
        this.loadingComments = false;

        this.cdr.detectChanges();
      }
    });
  }

  extractTicketComments(res: any): TicketComment[] {
    if (Array.isArray(res)) {
      return res;
    }

    if (Array.isArray(res?.data)) {
      return res.data;
    }

    if (Array.isArray(res?.data?.data)) {
      return res.data.data;
    }

    if (Array.isArray(res?.comments)) {
      return res.comments;
    }

    return [];
  }

 addTicketComment(): void {
  if (!this.selectedTicket) {
    return;
  }

  const ticketId = this.selectedTicket.id;

  if (!this.canCommentTicket()) {
    this.errorMessage = 'You do not have permission to comment on this ticket.';
    this.cdr.detectChanges();
    return;
  }

  if (!this.commentText.trim()) {
    this.errorMessage = 'Comment cannot be empty.';
    this.cdr.detectChanges();
    return;
  }

  this.sendingComment = true;
  this.errorMessage = '';

  const payload = {
    comment: this.commentText.trim()
  };

  this.http
    .post<any>(`${this.apiUrl}/tickets/${ticketId}/comments`, payload)
    .subscribe({
      next: (res) => {
        const newComment = res?.data ? res.data : res;

        this.ticketComments = [...this.ticketComments, newComment];
        this.commentText = '';
        this.sendingComment = false;

        this.loadTicketActivityLogs(ticketId);

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Add ticket comment error:', err);

        this.sendingComment = false;
        this.errorMessage =
          err?.error?.message ||
          'Unable to add comment. You may not have permission.';

        this.cdr.detectChanges();
      }
    });
}

  getCommentAuthor(comment: TicketComment): string {
    return comment.user?.name || comment.user?.email || `User #${comment.user_id}`;
  }

  getDisplayValue(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    return String(value);
  }

  formatStatus(status: string): string {
    const labels: Record<string, string> = {
      backlog: 'Backlog',
      todo: 'To Do',
      in_progress: 'In Progress',
      in_review: 'In Review',
      done: 'Done'
    };

    return labels[status] || status;
  }

  formatPriority(priority: string): string {
    if (!priority) {
      return '—';
    }

    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }

  getPersonName(person: any): string {
    if (!person) {
      return 'Unassigned';
    }

    return person.name || person.email || 'Unknown user';
  }

  getPriorityClass(priority: string): string {
    return `priority-${priority}`;
  }

  goBackToWorkspaces(): void {
    this.router.navigate(['/workspaces']);
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