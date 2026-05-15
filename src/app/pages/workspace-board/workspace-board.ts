import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EditorModule, TINYMCE_SCRIPT_SRC } from '@tinymce/tinymce-angular';

import { AppSidebar } from '../../components/app-sidebar/app-sidebar';
import { TicketModal } from '../../components/ticket-modal/ticket-modal';
import { WorkspaceMembersModal } from '../../components/workspace-members-modal/workspace-members-modal';

import {
  ApiResponse,
  Ticket,
  TicketFormData,
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
    AppSidebar,
    WorkspaceMembersModal
  ],
  providers: [
    { provide: TINYMCE_SCRIPT_SRC, useValue: '/tinymce/tinymce.min.js' }
  ],
  templateUrl: './workspace-board.html',
  styleUrl: './workspace-board.scss',
})
export class WorkspaceBoard implements OnInit {
  apiUrl = 'http://127.0.0.1:8000/api';

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
  showMembersModal = false;

  selectedTicket: Ticket | null = null;
  draggedTicket: Ticket | null = null;

  newTicket: TicketFormData = {
    title: '',
    description: '',
    status: 'ready_for_development',
    priority: 'medium',
    due_date: null,
    assigned_to: null
  };

  columns: { label: string; value: TicketStatus; description: string }[] = [
    {
      label: 'Ready for Development',
      value: 'ready_for_development',
      description: 'Approved and ready for dev'
    },
    {
      label: 'Dev in Progress',
      value: 'dev_in_progress',
      description: 'Currently being developed'
    },
    {
      label: 'Ready for Testing',
      value: 'ready_for_testing',
      description: 'Ready for QA testing'
    },
    {
      label: 'Ready for UAT',
      value: 'ready_for_uat',
      description: 'Ready for user acceptance'
    },
    {
      label: 'Done',
      value: 'done',
      description: 'Completed work'
    }
  ];

  editorConfig = {
    base_url: '/tinymce',
    suffix: '.min',
    height: 300,
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
    this.workspaceId = Number(this.route.snapshot.paramMap.get('id'));

    if (!this.workspaceId) {
      this.router.navigate(['/workspaces']);
      return;
    }

    this.loadWorkspace();
    this.loadWorkspaceMembers();
    this.loadTickets();
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
        this.errorMessage = err?.error?.message || 'Unable to load workspace details.';
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
        this.workspaceMembers = this.extractArray<WorkspaceMember>(res);
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

    this.http.get<ApiResponse<Ticket[]> | Ticket[]>(
      `${this.apiUrl}/workspaces/${this.workspaceId}/tickets`,
      { params }
    ).subscribe({
      next: (res) => {
        const allTickets = this.extractArray<Ticket>(res);

        this.tickets = allTickets.filter(ticket => ticket.status !== 'todo');

        this.loadingTickets = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Load tickets error:', err);
        this.loadingTickets = false;
        this.errorMessage = err?.error?.message || 'Unable to load tickets.';
        this.cdr.detectChanges();
      }
    });
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

  canManageMembers(): boolean {
    return this.workspace?.role === 'owner';
  }

  openCreateModal(status: TicketStatus = 'ready_for_development'): void {
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
      status: 'ready_for_development',
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

    const payload = {
      title: this.newTicket.title.trim(),
      description: this.newTicket.description?.trim() || '',
      status: this.newTicket.status,
      priority: this.newTicket.priority,
      due_date: this.newTicket.due_date || null,
      assigned_to: this.newTicket.assigned_to
    };

    this.creating = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.http.post<any>(
      `${this.apiUrl}/workspaces/${this.workspaceId}/tickets`,
      payload
    ).subscribe({
      next: (res) => {
        const createdTicket = res?.data ? res.data : res;

        if (createdTicket.status !== 'todo') {
          this.tickets = [createdTicket, ...this.tickets];
        }

        this.creating = false;
        this.showCreateModal = false;
        this.successMessage = 'Ticket created successfully.';

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Create ticket error:', err);
        this.creating = false;
        this.errorMessage = err?.error?.message || 'Unable to create ticket.';
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
      description: ticket.description || '',
      status: newStatus,
      priority: ticket.priority,
      assigned_to: ticket.assigned_to,
      due_date: ticket.due_date
    };

    this.http.put<any>(`${this.apiUrl}/tickets/${ticket.id}`, payload).subscribe({
      next: (res) => {
        const updatedTicket = res?.data ? res.data : res;

        if (updatedTicket.status === 'todo') {
          this.tickets = this.tickets.filter(item => item.id !== ticket.id);
        } else {
          this.tickets = this.tickets.map(item =>
            item.id === ticket.id ? updatedTicket : item
          );
        }

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
        this.errorMessage = err?.error?.message || 'Unable to update ticket status.';
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
        this.errorMessage = err?.error?.message || 'Unable to delete ticket.';
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
    this.showTicketDetailsModal = false;
    this.selectedTicket = null;
    this.cdr.detectChanges();
  }

  handleTicketUpdated(updatedTicket: Ticket): void {
  if (updatedTicket.status === 'todo') {
    this.tickets = this.tickets.filter(ticket => ticket.id !== updatedTicket.id);
    this.closeTicketDetails();
    this.successMessage = 'Ticket moved back to backlog.';
    this.cdr.detectChanges();
    return;
  }

  if (updatedTicket.status === 'completed') {
    this.tickets = this.tickets.filter(ticket => ticket.id !== updatedTicket.id);
    this.closeTicketDetails();
    this.successMessage = 'Ticket moved to archive.';
    this.cdr.detectChanges();
    return;
  }

  this.tickets = this.tickets.map(ticket =>
    ticket.id === updatedTicket.id ? updatedTicket : ticket
  );

  this.selectedTicket = updatedTicket;
  this.cdr.detectChanges();
}

  openMembersModal(): void {
    this.showMembersModal = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();
  }

  closeMembersModal(): void {
    this.showMembersModal = false;
    this.cdr.detectChanges();
  }

  goToArchive(): void {
  this.router.navigate(['/workspaces', this.workspaceId, 'archive']);
}

  goToBacklog(): void {
    this.router.navigate(['/workspaces', this.workspaceId, 'backlog']);
  }

  goToActivityLog(): void {
    this.router.navigate(['/workspaces', this.workspaceId, 'activity']);
  }

  goBackToWorkspaces(): void {
    this.router.navigate(['/workspaces']);
  }

  getPlainText(html: string | null | undefined): string {
    if (!html) return '';

    const div = document.createElement('div');
    div.innerHTML = html;

    return div.textContent || div.innerText || '';
  }

  formatStatus(status: string): string {
    const labels: Record<string, string> = {
      todo: 'To Do',
      ready_for_development: 'Ready for Development',
      dev_in_progress: 'Dev in Progress',
      ready_for_testing: 'Ready for Testing',
      ready_for_uat: 'Ready for UAT',
      done: 'Done'
    };

    return labels[status] || status;
  }

  getPriorityClass(priority: string): string {
    return `priority-${priority}`;
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
}