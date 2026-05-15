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

  commentText = '';
  sendingComment = false;
  loadingComments = false;
  ticketComments: TicketComment[] = [];

  selectedAttachmentFile: File | null = null;
  uploadingAttachment = false;
  loadingAttachments = false;
  attachmentError = '';
  ticketAttachments: TicketAttachment[] = [];

  loadingActivityLogs = false;
  activityLogError = '';
  ticketActivityLogs: ActivityLog[] = [];

  editTicketData: TicketFormData = {
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    due_date: null,
    assigned_to: null
  };

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

    this.editTicketData = {
      title: this.ticket.title || '',
      description: this.ticket.description || '',
      status: this.ticket.status || 'todo',
      priority: this.ticket.priority || 'medium',
      due_date: this.ticket.due_date || null,
      assigned_to: this.ticket.assigned_to || null
    };

    this.loadTicketComments(this.ticket.id);
    this.loadTicketAttachments(this.ticket.id);
    this.loadTicketActivityLogs(this.ticket.id);
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

    this.editTicketData = {
      title: this.ticket.title || '',
      description: this.ticket.description || '',
      status: this.ticket.status || 'todo',
      priority: this.ticket.priority || 'medium',
      due_date: this.ticket.due_date || null,
      assigned_to: this.ticket.assigned_to || null
    };

    this.cdr.detectChanges();
  }

  cancelEditingTicket(): void {
    this.editingTicket = false;
    this.errorMessage = '';

    if (this.ticket) {
      this.editTicketData = {
        title: this.ticket.title || '',
        description: this.ticket.description || '',
        status: this.ticket.status || 'todo',
        priority: this.ticket.priority || 'medium',
        due_date: this.ticket.due_date || null,
        assigned_to: this.ticket.assigned_to || null
      };
    }

    this.cdr.detectChanges();
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

    this.http.put<ApiResponse<Ticket> | Ticket | any>(
      `${this.apiUrl}/tickets/${this.ticket.id}`,
      payload
    ).subscribe({
      next: (res) => {
        const updatedTicket = res?.data ? res.data : res;

        this.ticket = updatedTicket;
        this.editingTicket = false;
        this.savingTicket = false;
        this.successMessage = 'Ticket updated successfully.';

        this.ticketUpdated.emit(updatedTicket);
        this.loadTicketActivityLogs(updatedTicket.id);

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Save ticket changes error:', err);

        this.savingTicket = false;
        this.errorMessage =
          err?.error?.message ||
          'Unable to update ticket. Please try again.';

        this.cdr.detectChanges();
      }
    });
  }

  loadTicketComments(ticketId: number): void {
    this.loadingComments = true;

    this.http.get<ApiResponse<TicketComment[]> | TicketComment[] | any>(
      `${this.apiUrl}/tickets/${ticketId}/comments`
    ).subscribe({
      next: (res) => {
        this.ticketComments = this.extractArray<TicketComment>(res);
        this.loadingComments = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Load comments error:', err);

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

    this.sendingComment = true;
    this.errorMessage = '';

    const payload = {
      comment: this.commentText.trim()
    };

    this.http
      .post<ApiResponse<TicketComment> | TicketComment | any>(
        `${this.apiUrl}/tickets/${this.ticket.id}/comments`,
        payload
      )
      .subscribe({
        next: (res) => {
          const newComment = res?.data ? res.data : res;

          this.ticketComments = [...this.ticketComments, newComment];
          this.commentText = '';
          this.sendingComment = false;

          if (this.ticket) {
            this.loadTicketActivityLogs(this.ticket.id);
          }

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

    this.http.get<ApiResponse<TicketAttachment[]> | TicketAttachment[] | any>(
      `${this.apiUrl}/tickets/${ticketId}/attachments`
    ).subscribe({
      next: (res) => {
        this.ticketAttachments = this.extractArray<TicketAttachment>(res);
        this.loadingAttachments = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Load attachments error:', err);

        this.ticketAttachments = [];
        this.loadingAttachments = false;
        this.attachmentError =
          err?.error?.message ||
          'Unable to load attachments.';

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

  uploadAttachment(inputElement: HTMLInputElement): void {
    if (!this.ticket) {
      return;
    }

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

    this.http.post<ApiResponse<TicketAttachment> | TicketAttachment | any>(
      `${this.apiUrl}/tickets/${this.ticket.id}/attachments`,
      formData
    ).subscribe({
      next: (res) => {
        const newAttachment = res?.data ? res.data : res;

        this.ticketAttachments = [...this.ticketAttachments, newAttachment];
        this.selectedAttachmentFile = null;
        inputElement.value = '';

        this.uploadingAttachment = false;

        if (this.ticket) {
          this.loadTicketActivityLogs(this.ticket.id);
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Upload attachment error:', err);

        this.uploadingAttachment = false;
        this.attachmentError =
          err?.error?.message ||
          'Unable to upload attachment.';

        this.cdr.detectChanges();
      }
    });
  }

  deleteAttachment(attachment: TicketAttachment): void {
    if (!this.ticket) {
      return;
    }

    if (!this.canEdit) {
      this.attachmentError = 'You do not have permission to delete attachments.';
      this.cdr.detectChanges();
      return;
    }

    const confirmed = confirm(`Delete attachment "${attachment.file_name}"?`);

    if (!confirmed) {
      return;
    }

    this.http.delete(
      `${this.apiUrl}/tickets/${this.ticket.id}/attachments/${attachment.id}`
    ).subscribe({
      next: () => {
        this.ticketAttachments = this.ticketAttachments.filter(
          item => item.id !== attachment.id
        );

        if (this.ticket) {
          this.loadTicketActivityLogs(this.ticket.id);
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Delete attachment error:', err);

        this.attachmentError =
          err?.error?.message ||
          'Unable to delete attachment.';

        this.cdr.detectChanges();
      }
    });
  }

  loadTicketActivityLogs(ticketId: number): void {
    this.loadingActivityLogs = true;
    this.activityLogError = '';

    this.http.get<ApiResponse<ActivityLog[]> | ActivityLog[] | any>(
      `${this.apiUrl}/tickets/${ticketId}/activity`
    ).subscribe({
      next: (res) => {
        this.ticketActivityLogs = this.extractArray<ActivityLog>(res);
        this.loadingActivityLogs = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Load ticket activity logs error:', err);

        this.ticketActivityLogs = [];
        this.loadingActivityLogs = false;
        this.activityLogError =
          err?.error?.message ||
          'Unable to load ticket activity logs.';

        this.cdr.detectChanges();
      }
    });
  }

  getPersonName(person: any): string {
    if (!person) {
      return 'Unassigned';
    }

    return person.name || person.email || 'Unknown User';
  }

  getCommentAuthor(comment: TicketComment): string {
    return comment.user?.name || comment.user?.email || 'Unknown User';
  }

  getDisplayValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    return String(value);
  }

  formatStatus(status: string | null | undefined): string {
  const labels: Record<string, string> = {
    todo: 'To Do / Backlog',
    ready_for_development: 'Ready for Development',
    dev_in_progress: 'Dev in Progress',
    ready_for_testing: 'Ready for Testing',
    ready_for_uat: 'Ready for UAT',
    done: 'Done',
    completed: 'Completed / Archived'
  };

  return status ? labels[status] || status : '—';
}

  formatPriority(priority: string | null | undefined): string {
    if (!priority) {
      return '—';
    }

    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }

  getPriorityClass(priority: string | null | undefined): string {
    return `priority-${priority || 'medium'}`;
  }

  isImageAttachment(attachment: any): boolean {
    const fileName = attachment?.file_name?.toLowerCase() || '';
    const fileType = attachment?.file_type?.toLowerCase() || '';

    return (
      fileType.startsWith('image/') ||
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg') ||
      fileName.endsWith('.png') ||
      fileName.endsWith('.gif') ||
      fileName.endsWith('.webp')
    );
  }

  isPdfAttachment(attachment: any): boolean {
    const fileName = attachment?.file_name?.toLowerCase() || '';
    const fileType = attachment?.file_type?.toLowerCase() || '';

    return fileType === 'application/pdf' || fileName.endsWith('.pdf');
  }

  getAttachmentIcon(attachment: any): string {
    const fileName = attachment?.file_name?.toLowerCase() || '';

    if (this.isImageAttachment(attachment)) return '🖼️';
    if (this.isPdfAttachment(attachment)) return '📄';
    if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return '📝';
    if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) return '📊';
    if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) return '📽️';
    if (fileName.endsWith('.zip') || fileName.endsWith('.rar')) return '🗂️';

    return '📎';
  }

  getAttachmentTypeLabel(attachment: any): string {
    const fileName = attachment?.file_name?.toLowerCase() || '';

    if (this.isImageAttachment(attachment)) return 'Image file';
    if (this.isPdfAttachment(attachment)) return 'PDF document';
    if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return 'Word document';
    if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) return 'Spreadsheet';
    if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) return 'Presentation';
    if (fileName.endsWith('.zip') || fileName.endsWith('.rar')) return 'Compressed file';

    return 'Attachment';
  }

  extractArray<T>(res: ApiResponse<T[]> | T[] | any): T[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.data?.data)) return res.data.data;
    if (Array.isArray(res?.comments)) return res.comments;
    if (Array.isArray(res?.attachments)) return res.attachments;
    if (Array.isArray(res?.logs)) return res.logs;

    return [];
  }

  canShowCompletedStatus(): boolean {
  return (
    this.ticket?.status === 'done' ||
    this.ticket?.status === 'completed' ||
    this.editTicketData.status === 'done' ||
    this.editTicketData.status === 'completed'
  );
}
}