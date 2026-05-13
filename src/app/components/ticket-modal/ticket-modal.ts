import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorModule, TINYMCE_SCRIPT_SRC } from '@tinymce/tinymce-angular';


import {
  ActivityLog,
  ApiResponse,
  Ticket,
  TicketAttachment,
  TicketComment,
  TicketFormData,
  TicketPriority,
  TicketStatus,
  WorkspaceMember
} from '../../interfaces/planora.interface';


@Component({
  selector: 'app-ticket-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, EditorModule],
  providers: [
    { provide: TINYMCE_SCRIPT_SRC, useValue: '/tinymce/tinymce.min.js' }
  ],
  templateUrl: './ticket-modal.html',
  styleUrl: './ticket-modal.scss'
})
export class TicketModal implements OnChanges {
  @Input() ticket: Ticket | null = null;
  @Input() workspaceMembers: WorkspaceMember[] = [];
  @Input() canEdit = false;
  @Input() canComment = false;
  @Input() apiUrl = 'http://127.0.0.1:8000/api';

  @Output() closeModal = new EventEmitter<void>();
  @Output() ticketUpdated = new EventEmitter<Ticket>();

  editingTicket = false;
  savingTicket = false;

  errorMessage = '';
  successMessage = '';

  editTicketData: TicketFormData = {
    title: '',
    description: '',
    status: 'backlog',
    priority: 'medium',
    due_date: null,
    assigned_to: null
  };

  commentText = '';
  ticketComments: TicketComment[] = [];
  loadingComments = false;
  sendingComment = false;

  ticketAttachments: TicketAttachment[] = [];
  loadingAttachments = false;
  uploadingAttachment = false;
  attachmentError = '';
  selectedAttachmentFile: File | null = null;

  ticketActivityLogs: ActivityLog[] = [];
  loadingActivityLogs = false;
  activityLogError = '';

  editorConfig = {
    base_url: '/tinymce',
    suffix: '.min',

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
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ticket'] && this.ticket) {
      this.initializeModal();
    }
  }

  initializeModal(): void {
    if (!this.ticket) {
      return;
    }

    this.editingTicket = false;
    this.savingTicket = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.commentText = '';
    this.attachmentError = '';
    this.activityLogError = '';
    this.selectedAttachmentFile = null;

    this.editTicketData = {
      title: this.ticket.title || '',
      description: this.ticket.description || '',
      status: this.ticket.status || 'backlog',
      priority: this.ticket.priority || 'medium',
      due_date: this.ticket.due_date || null,
      assigned_to: this.ticket.assigned_to ?? null
    };

    const ticketId = this.ticket.id;

    this.loadTicketComments(ticketId);
    this.loadTicketAttachments(ticketId);
    this.loadTicketActivityLogs(ticketId);
  }

  close(): void {
    this.closeModal.emit();
  }

  startEditingTicket(): void {
    if (!this.canEdit || !this.ticket) {
      return;
    }

    this.editingTicket = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelEditingTicket(): void {
    if (!this.ticket) {
      return;
    }

    this.editingTicket = false;

    this.editTicketData = {
      title: this.ticket.title || '',
      description: this.ticket.description || '',
      status: this.ticket.status,
      priority: this.ticket.priority,
      due_date: this.ticket.due_date || null,
      assigned_to: this.ticket.assigned_to ?? null
    };
  }

  saveTicketChanges(): void {
    if (!this.ticket) {
      return;
    }

    if (!this.canEdit) {
      this.errorMessage = 'You do not have permission to edit this ticket.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.editTicketData.title.trim()) {
      this.errorMessage = 'Ticket title is required.';
      this.cdr.detectChanges();
      return;
    }

    const ticketId = this.ticket.id;

    const payload = {
      title: this.editTicketData.title.trim(),
      description: this.editTicketData.description || '',
      status: this.editTicketData.status,
      priority: this.editTicketData.priority,
      due_date: this.editTicketData.due_date || null,
      assigned_to: this.editTicketData.assigned_to
    };

    this.savingTicket = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.http.put<ApiResponse<Ticket> | Ticket>(`${this.apiUrl}/tickets/${ticketId}`, payload)
      .subscribe({
        next: (res) => {
          const updatedTicket = this.extractSingle<Ticket>(res);

          this.ticket = updatedTicket;
          this.ticketUpdated.emit(updatedTicket);

          this.editingTicket = false;
          this.savingTicket = false;
          this.successMessage = 'Ticket updated successfully.';

          this.loadTicketActivityLogs(ticketId);
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

    this.http.get<ApiResponse<TicketComment[]> | TicketComment[]>(
      `${this.apiUrl}/tickets/${ticketId}/comments`
    ).subscribe({
      next: (res) => {
        this.ticketComments = this.extractArray<TicketComment>(res, 'comments');
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

  addTicketComment(): void {
    if (!this.ticket) {
      return;
    }

    const ticketId = this.ticket.id;

    if (!this.canComment) {
      this.errorMessage = 'You do not have permission to comment on this ticket.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.commentText.trim()) {
      this.errorMessage = 'Comment cannot be empty.';
      this.cdr.detectChanges();
      return;
    }

    const payload = {
      comment: this.commentText.trim()
    };

    this.sendingComment = true;
    this.errorMessage = '';

    this.http.post<ApiResponse<TicketComment> | TicketComment>(
      `${this.apiUrl}/tickets/${ticketId}/comments`,
      payload
    ).subscribe({
      next: (res) => {
        const newComment = this.extractSingle<TicketComment>(res);

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

  loadTicketAttachments(ticketId: number): void {
    this.loadingAttachments = true;
    this.attachmentError = '';

    this.http.get<ApiResponse<TicketAttachment[]> | TicketAttachment[]>(
      `${this.apiUrl}/tickets/${ticketId}/attachments`
    ).subscribe({
      next: (res) => {
        this.ticketAttachments = this.extractArray<TicketAttachment>(res, 'attachments');
        this.loadingAttachments = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Load attachments error:', err);

        this.ticketAttachments = [];
        this.loadingAttachments = false;
        this.attachmentError =
          err?.error?.message ||
          'Failed to load attachments.';

        this.cdr.detectChanges();
      }
    });
  }

  onAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      this.selectedAttachmentFile = null;
      return;
    }

    this.selectedAttachmentFile = input.files[0];
    this.attachmentError = '';
  }

  uploadAttachment(fileInput: HTMLInputElement): void {
    if (!this.ticket) {
      return;
    }

    const ticketId = this.ticket.id;

    if (!this.canEdit) {
      this.attachmentError = 'You do not have permission to upload attachments.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.selectedAttachmentFile) {
      this.attachmentError = 'Please select a file first.';
      this.cdr.detectChanges();
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedAttachmentFile);

    this.uploadingAttachment = true;
    this.attachmentError = '';

    this.http.post<ApiResponse<TicketAttachment> | TicketAttachment>(
      `${this.apiUrl}/tickets/${ticketId}/attachments`,
      formData
    ).subscribe({
      next: (res) => {
        const newAttachment = this.extractSingle<TicketAttachment>(res);

        this.ticketAttachments = [newAttachment, ...this.ticketAttachments];
        this.selectedAttachmentFile = null;
        fileInput.value = '';
        this.uploadingAttachment = false;

        this.loadTicketActivityLogs(ticketId);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Upload attachment error:', err);

        this.uploadingAttachment = false;
        this.attachmentError =
        err?.error?.errors?.file?.[0] ||
        err?.error?.message ||
        'Failed to upload attachment.';

        this.cdr.detectChanges();
      }
    });
  }

  deleteAttachment(attachment: TicketAttachment): void {
    if (!this.ticket) {
      return;
    }

    const ticketId = this.ticket.id;

    if (!this.canEdit) {
      this.attachmentError = 'You do not have permission to delete attachments.';
      this.cdr.detectChanges();
      return;
    }

    const confirmed = confirm(`Delete attachment "${attachment.file_name}"?`);

    if (!confirmed) {
      return;
    }

    this.http.delete(`${this.apiUrl}/attachments/${attachment.id}`).subscribe({
      next: () => {
        this.ticketAttachments = this.ticketAttachments.filter(
          item => item.id !== attachment.id
        );

        this.loadTicketActivityLogs(ticketId);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Delete attachment error:', err);

        this.attachmentError =
          err?.error?.message ||
          'Failed to delete attachment.';

        this.cdr.detectChanges();
      }
    });
  }

  loadTicketActivityLogs(ticketId: number): void {
    this.loadingActivityLogs = true;
    this.activityLogError = '';

    this.http.get<ApiResponse<ActivityLog[]> | ActivityLog[]>(
      `${this.apiUrl}/tickets/${ticketId}/activity`
    ).subscribe({
      next: (res) => {
        this.ticketActivityLogs = this.extractArray<ActivityLog>(res, 'activity_logs');
        this.loadingActivityLogs = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Load activity logs error:', err);

        this.ticketActivityLogs = [];
        this.loadingActivityLogs = false;
        this.activityLogError =
          err?.error?.message ||
          'Failed to load activity logs.';

        this.cdr.detectChanges();
      }
    });
  }

  extractArray<T>(res: ApiResponse<T[]> | T[] | any, fallbackKey: string): T[] {
    if (Array.isArray(res)) {
      return res;
    }

    if (Array.isArray(res?.data)) {
      return res.data;
    }

    if (Array.isArray(res?.data?.data)) {
      return res.data.data;
    }

    if (Array.isArray(res?.[fallbackKey])) {
      return res[fallbackKey];
    }

    return [];
  }

  extractSingle<T>(res: ApiResponse<T> | T | any): T {
    if (res?.data) {
      return res.data as T;
    }

    return res as T;
  }

  getCommentAuthor(comment: TicketComment): string {
    return comment.user?.name || comment.user?.email || `User #${comment.user_id}`;
  }

  getDisplayValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    return String(value);
  }

  formatStatus(status: TicketStatus | string | undefined): string {
    const labels: Record<string, string> = {
      backlog: 'Backlog',
      todo: 'To Do',
      in_progress: 'In Progress',
      in_review: 'In Review',
      done: 'Done'
    };

    return status ? labels[status] || status : '—';
  }

  formatPriority(priority: TicketPriority | string | undefined): string {
    if (!priority) {
      return '—';
    }

    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }

  getPersonName(person: { name?: string; email?: string } | null | undefined): string {
    if (!person) {
      return 'Unassigned';
    }

    return person.name || person.email || 'Unknown user';
  }

  getPriorityClass(priority: TicketPriority | string | undefined): string {
    return priority ? `priority-${priority}` : '';
  }
}