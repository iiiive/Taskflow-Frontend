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
  Epic,
  KanbanColumn,
  Ticket,
  TicketAttachment,
  TicketComment,
  TicketFormData,
  TicketStatus,
  WorkspaceMember
} from '../../interfaces/planora.interface';

interface TicketTimeLog {
  id: number;
  workspace_id: number;
  ticket_id: number;
  user_id: number;
  hours: number;
  description?: string | null;
  work_date: string;
  created_at?: string | null;
  updated_at?: string | null;
  user?: {
    id: number;
    name?: string | null;
    email?: string | null;
  } | null;
  ticket?: {
    id: number;
    title?: string | null;
  } | null;
}

interface TimeLogFormData {
  hours: number | null;
  description: string;
  work_date: string;
}

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
  @Input() kanbanColumns: KanbanColumn[] = [];
  @Input() epics: Epic[] = [];
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

  loadingTimeLogs = false;
  submittingTimeLog = false;
  timeLogError = '';
  ticketTimeLogs: TicketTimeLog[] = [];

  timeLogForm: TimeLogFormData = {
    hours: null,
    description: '',
    work_date: this.getTodayDate()
  };

  editTicketData: TicketFormData = {
    title: '',
    description: '',
    status: 'todo',
    kanban_column_id: null,
    epic_id: null,
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
    this.timeLogError = '';

    this.timeLogForm = {
      hours: null,
      description: '',
      work_date: this.getTodayDate()
    };

    this.editTicketData = {
      title: this.ticket.title || '',
      description: this.ticket.description || '',
      status: this.ticket.status || 'todo',
      kanban_column_id: this.ticket.kanban_column_id || null,
      epic_id: this.ticket.epic_id || null,
      priority: this.ticket.priority || 'medium',
      due_date: this.ticket.due_date || null,
      assigned_to: this.ticket.assigned_to || null
    };

    this.loadTicketComments(this.ticket.id);
    this.loadTicketAttachments(this.ticket.id);
    this.loadTicketActivityLogs(this.ticket.id);
    this.loadTicketTimeLogs(this.ticket.id);
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
      kanban_column_id: this.ticket.kanban_column_id || null,
      epic_id: this.ticket.epic_id || null,
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
        kanban_column_id: this.ticket.kanban_column_id || null,
        epic_id: this.ticket.epic_id || null,
        priority: this.ticket.priority || 'medium',
        due_date: this.ticket.due_date || null,
        assigned_to: this.ticket.assigned_to || null
      };
    }

    this.cdr.detectChanges();
  }

  getEditedColumn(): KanbanColumn | null {
    if (!this.editTicketData.kanban_column_id) {
      return null;
    }

    return this.kanbanColumns.find(
      column => Number(column.id) === Number(this.editTicketData.kanban_column_id)
    ) || null;
  }

  getEditedColumnName(): string {
    const column = this.getEditedColumn();

    if (column?.name) {
      return column.name;
    }

    return this.getColumnName(this.ticket);
  }

  getEditedStatusKey(): TicketStatus {
    if (this.editTicketData.status === 'completed') {
      return 'completed';
    }

    const column = this.getEditedColumn();

    return (column?.status_key as TicketStatus) || this.editTicketData.status || 'todo';
  }

  getEditedStatusLabel(): string {
    return this.formatStatus(this.getEditedStatusKey());
  }

  onEditKanbanColumnChange(columnId: number | null): void {
    const selectedColumn = this.kanbanColumns.find(
      column => Number(column.id) === Number(columnId)
    );

    if (!selectedColumn) {
      this.editTicketData.kanban_column_id = null;
      return;
    }

    this.editTicketData.kanban_column_id = selectedColumn.id;

    /**
     * Custom Kanban columns can be renamed by the user, but the system still
     * needs a stable status key for dashboard counts, backlog logic, done logic,
     * due-date warnings, and archive behavior.
     */
    this.editTicketData.status = (selectedColumn.status_key as TicketStatus) || 'todo';

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

    const selectedColumn = this.kanbanColumns.find(
      column => column.id === Number(this.editTicketData.kanban_column_id)
    );

    const resolvedStatus: TicketStatus =
      this.editTicketData.status === 'completed'
        ? 'completed'
        : ((selectedColumn?.status_key as TicketStatus) || this.editTicketData.status || 'todo');

    const payload = {
      title: this.editTicketData.title.trim(),
      description: this.editTicketData.description || '',
      status: resolvedStatus,
      kanban_column_id: selectedColumn?.id || this.editTicketData.kanban_column_id || null,
      epic_id: this.editTicketData.epic_id || null,
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
      `${this.apiUrl}/attachments/${attachment.id}`
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

  loadTicketTimeLogs(ticketId: number): void {
    this.loadingTimeLogs = true;
    this.timeLogError = '';

    this.http.get<ApiResponse<TicketTimeLog[]> | TicketTimeLog[] | any>(
      `${this.apiUrl}/tickets/${ticketId}/time-logs`
    ).subscribe({
      next: (res) => {
        this.ticketTimeLogs = this.extractArray<TicketTimeLog>(res);
        this.loadingTimeLogs = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Load ticket time logs error:', err);

        this.ticketTimeLogs = [];
        this.loadingTimeLogs = false;
        this.timeLogError =
          err?.error?.message ||
          'Unable to load time logs.';

        this.cdr.detectChanges();
      }
    });
  }

  addTicketTimeLog(): void {
    if (!this.ticket) {
      return;
    }

    if (!this.canLogTime()) {
      this.timeLogError = 'You do not have permission to log time on this ticket.';
      this.cdr.detectChanges();
      return;
    }

    const hours = Number(this.timeLogForm.hours);

    if (!hours || hours <= 0) {
      this.timeLogError = 'Please enter valid hours greater than 0.';
      this.cdr.detectChanges();
      return;
    }

    if (hours > 24) {
      this.timeLogError = 'You cannot log more than 24 hours in one entry.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.timeLogForm.work_date) {
      this.timeLogError = 'Please select a work date.';
      this.cdr.detectChanges();
      return;
    }

    const payload = {
      hours,
      description: this.timeLogForm.description?.trim() || null,
      work_date: this.timeLogForm.work_date
    };

    this.submittingTimeLog = true;
    this.timeLogError = '';
    this.successMessage = '';

    this.http.post<ApiResponse<TicketTimeLog> | TicketTimeLog | any>(
      `${this.apiUrl}/tickets/${this.ticket.id}/time-logs`,
      payload
    ).subscribe({
      next: (res) => {
        const newTimeLog = res?.data ? res.data : res;

        this.ticketTimeLogs = [newTimeLog, ...this.ticketTimeLogs];

        this.timeLogForm = {
          hours: null,
          description: '',
          work_date: this.getTodayDate()
        };

        this.submittingTimeLog = false;
        this.successMessage = 'Time logged successfully.';

        if (this.ticket) {
          this.loadTicketActivityLogs(this.ticket.id);
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Add ticket time log error:', err);

        this.submittingTimeLog = false;
        this.timeLogError =
          err?.error?.message ||
          'Unable to add time log.';

        this.cdr.detectChanges();
      }
    });
  }

  canLogTime(): boolean {
    if (!this.ticket) {
      return false;
    }

    const currentUserId = this.getCurrentUserId();
    const assignedTo = Number(this.ticket.assigned_to);

    return this.canEdit || (!!currentUserId && assignedTo === currentUserId);
  }

  getCurrentUserId(): number | null {
    const userJson =
      localStorage.getItem('user') ||
      localStorage.getItem('currentUser') ||
      localStorage.getItem('auth_user');

    if (!userJson) {
      return null;
    }

    try {
      const user = JSON.parse(userJson);
      return user?.id ? Number(user.id) : null;
    } catch {
      return null;
    }
  }

  getTodayDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  getTotalLoggedHours(): number {
    return this.ticketTimeLogs.reduce((total, log) => {
      return total + Number(log.hours || 0);
    }, 0);
  }

  formatHours(hours: number | string | null | undefined): string {
    const value = Number(hours || 0);

    if (Number.isInteger(value)) {
      return `${value} hr${value === 1 ? '' : 's'}`;
    }

    return `${value.toFixed(2).replace(/\.?0+$/, '')} hrs`;
  }

  getTimeLogAuthor(log: TicketTimeLog): string {
    return log.user?.name || log.user?.email || `User #${log.user_id}`;
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

  getColumnName(ticket: Ticket | null | undefined): string {
    if (!ticket) {
      return '—';
    }

    if (ticket.kanban_column?.name) {
      return ticket.kanban_column.name;
    }

    const column = this.kanbanColumns.find(
      item => item.id === Number(ticket.kanban_column_id)
    );

    return column?.name || this.formatStatus(ticket.status);
  }

  getEpicName(ticket: Ticket | null | undefined): string {
    if (!ticket) {
      return 'No Epic';
    }

    if (ticket.epic?.name) {
      return ticket.epic.name;
    }

    const epic = this.epics.find(item => item.id === Number(ticket.epic_id));

    return epic?.name || 'No Epic';
  }

  getEpicColor(ticket: Ticket | null | undefined): string {
    if (!ticket) {
      return '#64748b';
    }

    if (ticket.epic?.color) {
      return ticket.epic.color;
    }

    const epic = this.epics.find(item => item.id === Number(ticket.epic_id));

    return epic?.color || '#64748b';
  }

  hasEpic(ticket: Ticket | null | undefined): boolean {
    return !!ticket?.epic_id || !!ticket?.epic;
  }

  formatStatus(status: string | null | undefined): string {
    const labels: Record<string, string> = {
      todo: 'To Do / Backlog',
      in_progress: 'In Progress',
      in_review: 'In Review',
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
    if (Array.isArray(res?.time_logs)) return res.time_logs;

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