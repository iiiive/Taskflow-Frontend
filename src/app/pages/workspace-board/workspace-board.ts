import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EditorModule, TINYMCE_SCRIPT_SRC } from '@tinymce/tinymce-angular';
import { AppSidebar } from '../../components/app-sidebar/app-sidebar';
import { TicketModal } from '../../components/ticket-modal/ticket-modal';

import {
  ApiResponse,
  Ticket,
  TicketFormData,
  TicketPriority,
  TicketStatus,
  Workspace,
  WorkspaceMember
} from '../../interfaces/planora.interface';

@Component({
  selector: 'app-workspace-board',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EditorModule,
    TicketModal,
    AppSidebar
  ],
  providers: [
    { provide: TINYMCE_SCRIPT_SRC, useValue: '/tinymce/tinymce.min.js' }
  ],
  templateUrl: './workspace-board.html',
  styleUrl: './workspace-board.scss',
})
export class WorkspaceBoard implements OnInit {
  userName = 'User';

  workspaceId!: number;
  workspace: Workspace | null = null;

  workspaceMembers: WorkspaceMember[] = [];
  tickets: Ticket[] = [];

  loadingWorkspace = true;
  loadingTickets = true;
  loadingMembers = false;

  creating = false;

  errorMessage = '';
  successMessage = '';

  search = '';
  selectedPriority = '';
  selectedStatus = '';

  showCreateModal = false;
  showTicketDetailsModal = false;

  selectedTicket: Ticket | null = null;
  draggedTicket: Ticket | null = null;

  apiUrl = 'http://127.0.0.1:8000/api';

  newTicket: TicketFormData = {
    title: '',
    description: '',
    status: 'backlog',
    priority: 'medium',
    due_date: null,
    assigned_to: null
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

editorConfig = {
  height: 360,
  menubar: false,
  branding: false,
  promotion: false,
  paste_data_images: true,
  automatic_uploads: false,
  object_resizing: true,
  plugins: 'lists link image table code autoresize',
  toolbar:
    'undo redo | bold italic underline strikethrough | fontfamily fontsize | ' +
    'alignleft aligncenter alignright alignjustify | bullist numlist | ' +
    'link image table | removeformat code',
  image_advtab: true,
  image_dimensions: true,
  resize: true,
  content_style: `
    body {
      font-family: Arial, sans-serif;
      font-size: 14px;
      color: #1f2937;
    }

    img {
      max-width: 100%;
      height: auto;
      border-radius: 10px;
    }
  `
};
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
          'Unable to load workspace details.';

        this.cdr.detectChanges();
      }
    });
  }

  loadWorkspaceMembers(): void {
    this.loadingMembers = true;

    this.http.get<any>(
      `${this.apiUrl}/workspaces/${this.workspaceId}/members`
    ).subscribe({
      next: (res) => {
        this.workspaceMembers = this.extractWorkspaceMembers(res);
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

    this.http.get<any>(
      `${this.apiUrl}/workspaces/${this.workspaceId}/tickets`,
      { params }
    ).subscribe({
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

  extractSingle<T>(res: ApiResponse<T> | T | any): T {
    if (res?.data) {
      return res.data as T;
    }

    return res as T;
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
      due_date: null,
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
      due_date: null,
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
      description: this.newTicket.description || '',
      status: this.newTicket.status,
      priority: this.newTicket.priority,
      due_date: this.newTicket.due_date || null,
      assigned_to: this.newTicket.assigned_to
    };

    this.http.post<ApiResponse<Ticket> | Ticket>(
      `${this.apiUrl}/workspaces/${this.workspaceId}/tickets`,
      payload
    ).subscribe({
      next: (res) => {
        const createdTicket = this.extractSingle<Ticket>(res);

        this.tickets = [createdTicket, ...this.tickets];

        this.creating = false;
        this.showCreateModal = false;
        this.successMessage = 'Ticket created successfully.';

        this.newTicket = {
          title: '',
          description: '',
          status: 'backlog',
          priority: 'medium',
          due_date: null,
          assigned_to: null
        };

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
    if (!this.canEditTicket()) {
      this.errorMessage = 'You do not have permission to edit tickets.';
      this.cdr.detectChanges();
      return;
    }

    const oldStatus = ticket.status;

    ticket.status = newStatus;
    this.cdr.detectChanges();

    const payload = {
      title: ticket.title,
      description: ticket.description || '',
      status: newStatus,
      priority: ticket.priority,
      assigned_to: ticket.assigned_to,
      due_date: ticket.due_date || null
    };

    this.http.put<ApiResponse<Ticket> | Ticket>(
      `${this.apiUrl}/tickets/${ticket.id}`,
      payload
    ).subscribe({
      next: (res) => {
        const updatedTicket = this.extractSingle<Ticket>(res);

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
    if (!this.canEditTicket()) {
      this.errorMessage = 'You do not have permission to delete tickets.';
      this.cdr.detectChanges();
      return;
    }

    const confirmed = confirm(`Delete ticket "${ticket.title}"?`);

    if (!confirmed) {
      return;
    }

    this.http.delete(`${this.apiUrl}/tickets/${ticket.id}`).subscribe({
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
    this.errorMessage = '';
    this.successMessage = '';

    this.cdr.detectChanges();
  }

  closeTicketDetails(): void {
    this.selectedTicket = null;
    this.showTicketDetailsModal = false;
    this.errorMessage = '';

    this.cdr.detectChanges();
  }

  handleTicketUpdated(updatedTicket: Ticket): void {
    this.tickets = this.tickets.map(ticket =>
      ticket.id === updatedTicket.id ? updatedTicket : ticket
    );

    this.selectedTicket = updatedTicket;
    this.successMessage = 'Ticket updated successfully.';
    this.errorMessage = '';

    this.cdr.detectChanges();
  }

  getPlainText(value?: string | null): string {
    if (!value) {
      return '';
    }

    const withoutTags = value.replace(/<[^>]*>/g, ' ');
    const textarea = document.createElement('textarea');
    textarea.innerHTML = withoutTags;

    return textarea.value.replace(/\s+/g, ' ').trim();
  }

  getPriorityClass(priority: TicketPriority | string | undefined): string {
    return priority ? `priority-${priority}` : '';
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