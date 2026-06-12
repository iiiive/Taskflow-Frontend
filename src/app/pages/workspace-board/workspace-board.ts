import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { EditorModule, TINYMCE_SCRIPT_SRC } from '@tinymce/tinymce-angular';

import { TicketModal } from '../../components/ticket-modal/ticket-modal';
import { WorkspaceMembersModal } from '../../components/workspace-members-modal/workspace-members-modal';

import {
  ApiResponse,
  Epic,
  KanbanColumn,
  Label,
  Ticket,
  TicketFormData,
  TicketPriority,
  TicketStatus,
  Workspace,
  WorkspaceMember
} from '../../interfaces/planora.interface';
import {
  ISSUE_TYPE_OPTIONS,
  ISSUE_TYPE_LABELS,
  PRIORITY_OPTIONS,
  PRIORITY_LABELS
} from '../../constants/planora.constants';

import { WorkspaceTabs } from '../../components/workspace-tabs/workspace-tabs';

@Component({
  selector: 'app-workspace-board',
  standalone: true,
  imports: [WorkspaceTabs, 
    CommonModule,
    FormsModule,
    EditorModule,
    TicketModal,
    WorkspaceMembersModal
  ],
  providers: [
    { provide: TINYMCE_SCRIPT_SRC, useValue: '/tinymce/tinymce.min.js' }
  ],
  templateUrl: './workspace-board.html',
  styleUrl: './workspace-board.scss',
})
export class WorkspaceBoard implements OnInit {
  apiUrl = environment.apiUrl;

  workspaceId!: number;
  workspace: Workspace | null = null;
  workspaceMembers: WorkspaceMember[] = [];
  kanbanColumns: KanbanColumn[] = [];
  tickets: Ticket[] = [];
  epics: Epic[] = [];

  loadingWorkspace = true;
  loadingBoard = true;
  loadingMembers = false;
  loadingEpics = false;

  creating = false;
  addingColumn = false;
  savingColumn = false;
  reorderingColumns = false;
  creatingEpic = false;

  errorMessage = '';
  successMessage = '';

  search = '';
  selectedPriority: '' | TicketPriority = '';
  selectedColumnId: number | '' = '';
  selectedEpicId: number | '' = '';

  swimlaneMode: '' | 'assignee' | 'epic' | 'priority' = '';

  showCreateModal = false;
  showTicketDetailsModal = false;
  showMembersModal = false;
  showAddColumnForm = false;
  showCreateEpicModal = false;

  selectedTicket: Ticket | null = null;
  draggedTicket: Ticket | null = null;
  draggedColumn: KanbanColumn | null = null;
  columnDragOverId: number | null = null;

  editingColumnId: number | null = null;
  editingColumnName = '';
  editingColumnWip: number | null = null;
  newColumnName = '';

  selectedCreateColumn: KanbanColumn | null = null;

  newEpic = {
    name: '',
    description: '',
    color: '#547A95'
  };

  newTicket: TicketFormData = {
    title: '',
    description: '',
    status: 'todo',
    issue_type: 'task',
    kanban_column_id: null,
    epic_id: null,
    priority: 'medium',
    due_date: null,
    assigned_to: null,
    label_ids: []
  };

  // Shared option lists (typed) for the create-ticket form.
  issueTypeOptions = ISSUE_TYPE_OPTIONS;
  priorityOptions = PRIORITY_OPTIONS;
  labels: Label[] = [];

  priorityLabel(priority: string | null | undefined): string {
    return PRIORITY_LABELS[priority ?? ''] ?? (priority ?? '');
  }

  issueTypeLabel(type: string | null | undefined): string {
    return ISSUE_TYPE_LABELS[type ?? ''] ?? (type ?? '');
  }

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

  // Scrum: the board is filtered to the active sprint; null = no active sprint.
  activeSprintId: number | null = null;

  ngOnInit(): void {
    this.workspaceId = Number(this.route.snapshot.paramMap.get('id'));

    if (!this.workspaceId) {
      this.router.navigate(['/projects']);
      return;
    }

    this.loadWorkspace();
    this.loadWorkspaceMembers();
    this.loadEpics();
    this.loadLabels();
    this.loadActiveSprint();
    this.loadKanbanColumns();
  }

  isScrum(): boolean {
    return (this.workspace as any)?.project_mode === 'scrum';
  }

  loadActiveSprint(): void {
    this.http.get<any>(
      `${this.apiUrl}/projects/${this.workspaceId}/sprints`
    ).subscribe({
      next: (res) => {
        const sprints = this.extractArray<any>(res);
        const active = sprints.find(s => s.status === 'active');
        this.activeSprintId = active ? Number(active.id) : null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.activeSprintId = null;
      }
    });
  }

  goToBacklog(): void {
    this.router.navigate(['/projects', this.workspaceId, 'backlog']);
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
        this.errorMessage = err?.error?.message || 'Unable to load workspace details.';
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
      error: (err) => {
        console.error('Load workspace members error:', err);
        this.workspaceMembers = [];
        this.loadingMembers = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadEpics(): void {
    this.loadingEpics = true;

    this.http.get<ApiResponse<Epic[]> | Epic[] | any>(
      `${this.apiUrl}/projects/${this.workspaceId}/epics`
    ).subscribe({
      next: (res) => {
        this.epics = this.extractArray<Epic>(res);
        this.loadingEpics = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Load epics error:', err);
        this.epics = [];
        this.loadingEpics = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadLabels(): void {
    this.http.get<ApiResponse<Label[]> | Label[] | any>(
      `${this.apiUrl}/projects/${this.workspaceId}/labels`
    ).subscribe({
      next: (res) => {
        this.labels = this.extractArray<Label>(res);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Load labels error:', err);
        this.labels = [];
      }
    });
  }

  toggleNewTicketLabel(labelId: number): void {
    const ids = this.newTicket.label_ids ?? [];
    this.newTicket.label_ids = ids.includes(labelId)
      ? ids.filter(id => id !== labelId)
      : [...ids, labelId];
  }

  isNewTicketLabelSelected(labelId: number): boolean {
    return (this.newTicket.label_ids ?? []).includes(labelId);
  }

  loadKanbanColumns(): void {
    this.loadingBoard = true;
    this.errorMessage = '';

    this.http.get<ApiResponse<KanbanColumn[]> | KanbanColumn[]>(
      `${this.apiUrl}/projects/${this.workspaceId}/kanban-columns`
    ).subscribe({
      next: (res) => {
        this.kanbanColumns = this.extractArray<KanbanColumn>(res)
          .sort((a, b) => a.position - b.position);

        this.tickets = this.kanbanColumns.flatMap(column => {
          return (column.tickets || []).map(ticket => ({
            ...ticket,
            kanban_column_id: ticket.kanban_column_id || column.id,
            kanban_column: ticket.kanban_column || column
          }));
        });

        this.loadingBoard = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Load Kanban columns error:', err);
        this.loadingBoard = false;
        this.errorMessage = err?.error?.message || 'Unable to load Kanban board.';
        this.cdr.detectChanges();
      }
    });
  }

  getVisibleColumns(): KanbanColumn[] {
    if (!this.selectedColumnId) {
      return this.kanbanColumns;
    }

    return this.kanbanColumns.filter(column => column.id === Number(this.selectedColumnId));
  }

  getTicketsByColumn(columnId: number): Ticket[] {
    const keyword = this.search.trim().toLowerCase();

    return this.tickets
      .filter(ticket => ticket.kanban_column_id === columnId)
      .filter(ticket => {
        // Scrum boards only show the active sprint; backlog/other sprints are hidden.
        if (!this.isScrum()) {
          return true;
        }
        return this.activeSprintId !== null
          && Number((ticket as any).sprint_id) === this.activeSprintId;
      })
      .filter(ticket => {
        if (!this.selectedPriority) {
          return true;
        }

        return ticket.priority === this.selectedPriority;
      })
      .filter(ticket => {
        if (!this.selectedEpicId) {
          return true;
        }

        return Number(ticket.epic_id) === Number(this.selectedEpicId);
      })
      .filter(ticket => {
        if (!keyword) {
          return true;
        }

        const title = ticket.title?.toLowerCase() || '';
        const description = this.getPlainText(ticket.description).toLowerCase();

        return title.includes(keyword) || description.includes(keyword);
      });
  }

  getTicketCount(column: KanbanColumn): number {
    return this.getTicketsByColumn(column.id).length;
  }

  getSwimlaneGroups(columnId: number): { label: string; tickets: Ticket[] }[] {
    const tickets = this.getTicketsByColumn(columnId);

    if (!this.swimlaneMode) {
      return [{ label: '', tickets }];
    }

    const groups = new Map<string, Ticket[]>();

    for (const ticket of tickets) {
      let key: string;

      if (this.swimlaneMode === 'assignee') {
        key = ticket.assignee?.name || 'Unassigned';
      } else if (this.swimlaneMode === 'epic') {
        key = this.getEpicName(ticket) || 'No Epic';
      } else {
        key = ticket.priority || 'none';
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(ticket);
    }

    return Array.from(groups.entries()).map(([label, t]) => ({ label, tickets: t }));
  }

  canEditTicket(): boolean {
    return this.workspace?.role === 'owner' ||
      this.workspace?.role === 'editor' ||
      this.workspace?.can_edit === true;
  }

  canCommentTicket(): boolean {
    return this.workspace?.role === 'owner' ||
      this.workspace?.role === 'editor' ||
      this.workspace?.can_edit === true;
  }

  canManageMembers(): boolean {
    return this.workspace?.role === 'owner' ||
      this.workspace?.can_manage_members === true;
  }

  canDeleteColumn(column: KanbanColumn): boolean {
    return this.canEditTicket() &&
      !column.is_backlog_column &&
      !column.is_done_column &&
      this.getTicketsByColumn(column.id).length === 0;
  }

  openCreateEpicModal(): void {
    if (!this.canEditTicket()) {
      return;
    }

    this.showCreateEpicModal = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.newEpic = {
      name: '',
      description: '',
      color: '#547A95'
    };

    this.cdr.detectChanges();
  }

  closeCreateEpicModal(): void {
    this.showCreateEpicModal = false;
    this.creatingEpic = false;

    this.newEpic = {
      name: '',
      description: '',
      color: '#547A95'
    };

    this.cdr.detectChanges();
  }

  createEpic(): void {
    const name = this.newEpic.name.trim();
    const description = this.newEpic.description.trim();
    const color = this.newEpic.color || '#547A95';

    if (!name) {
      this.errorMessage = 'Epic name is required.';
      this.cdr.detectChanges();
      return;
    }

    this.creatingEpic = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      name,
      description,
      color
    };

    this.http.post<any>(
      `${this.apiUrl}/projects/${this.workspaceId}/epics`,
      payload
    ).subscribe({
      next: (res) => {
        const createdEpic = this.extractSingle<Epic>(res);

        this.creatingEpic = false;
        this.showCreateEpicModal = false;
        this.successMessage = 'Epic created successfully.';

        if (createdEpic?.id) {
          this.epics = [createdEpic, ...this.epics];
        }

        this.loadEpics();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Create epic error:', err);
        this.creatingEpic = false;
        this.errorMessage = err?.error?.message || 'Unable to create epic.';
        this.cdr.detectChanges();
      }
    });
  }

  openCreateModal(column?: KanbanColumn): void {
    const targetColumn = column || this.getBacklogColumn() || this.kanbanColumns[0] || null;

    this.selectedCreateColumn = targetColumn;
    this.showCreateModal = true;

    this.newTicket = {
      title: '',
      description: '',
      status: this.getStatusForColumn(targetColumn),
      issue_type: 'task',
      kanban_column_id: targetColumn?.id || null,
      epic_id: null,
      priority: 'medium',
      due_date: null,
      assigned_to: null,
      label_ids: []
    };

    this.errorMessage = '';
    this.successMessage = '';

    this.cdr.detectChanges();
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.creating = false;
    this.errorMessage = '';
    this.selectedCreateColumn = null;

    this.newTicket = {
      title: '',
      description: '',
      status: 'todo',
      issue_type: 'task',
      kanban_column_id: null,
      epic_id: null,
      priority: 'medium',
      due_date: null,
      assigned_to: null,
      label_ids: []
    };

    this.cdr.detectChanges();
  }

  createTicket(): void {
    if (!this.newTicket.title.trim()) {
      this.errorMessage = 'Ticket title is required.';
      this.cdr.detectChanges();
      return;
    }

    const targetColumn = this.kanbanColumns.find(
      column => column.id === Number(this.newTicket.kanban_column_id)
    ) || this.getBacklogColumn() || this.kanbanColumns[0];

    const payload: any = {
      title: this.newTicket.title.trim(),
      description: this.newTicket.description?.trim() || '',
      issue_type: this.newTicket.issue_type || 'task',
      kanban_column_id: targetColumn?.id || null,
      epic_id: this.newTicket.epic_id || null,
      priority: this.newTicket.priority,
      due_date: this.newTicket.due_date || null,
      assigned_to: this.newTicket.assigned_to,
      label_ids: this.newTicket.label_ids || []
    };

    /*
    |--------------------------------------------------------------------------
    | Important Fix
    |--------------------------------------------------------------------------
    | Only send status when the selected column has a real system status_key.
    | Custom columns must not be forced to "todo", because that causes wrong
    | activity/email descriptions.
    */
    if (targetColumn?.status_key) {
      payload.status = targetColumn.status_key;
    }

    this.creating = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.http.post<any>(
      `${this.apiUrl}/projects/${this.workspaceId}/tickets`,
      payload
    ).subscribe({
      next: (res) => {
        const created = res?.data ? res.data : res;

        const finish = (message: string) => {
          this.creating = false;
          this.showCreateModal = false;
          this.selectedCreateColumn = null;
          this.successMessage = message;
          this.loadKanbanColumns();
        };

        // Scrum: a board-created ticket joins the active sprint so it stays visible.
        if (this.isScrum() && this.activeSprintId && created?.id) {
          this.http.post<any>(
            `${this.apiUrl}/tickets/${created.id}/sprint`,
            { sprint_id: this.activeSprintId }
          ).subscribe({
            next: () => finish('Ticket created in the active sprint.'),
            error: () => finish('Ticket created.')
          });
        } else if (this.isScrum() && !this.activeSprintId && created?.id) {
          finish('Ticket created in the backlog (no active sprint).');
        } else {
          finish('Ticket created successfully.');
        }
      },
      error: (err) => {
        console.error('Create ticket error:', err);
        this.creating = false;
        this.errorMessage = err?.error?.message || 'Unable to create ticket.';
        this.cdr.detectChanges();
      }
    });
  }

  addKanbanColumn(): void {
    const name = this.newColumnName.trim();

    if (!name) {
      this.errorMessage = 'Column name is required.';
      this.cdr.detectChanges();
      return;
    }

    this.addingColumn = true;
    this.errorMessage = '';
    this.successMessage = '';

    /*
    |--------------------------------------------------------------------------
    | Important Fix
    |--------------------------------------------------------------------------
    | Only send the column name. The backend should create custom columns with
    | status_key = null.
    */
    this.http.post<any>(
      `${this.apiUrl}/projects/${this.workspaceId}/kanban-columns`,
      { name }
    ).subscribe({
      next: () => {
        this.newColumnName = '';
        this.showAddColumnForm = false;
        this.addingColumn = false;
        this.successMessage = 'Kanban column added successfully.';
        this.loadKanbanColumns();
      },
      error: (err) => {
        console.error('Add column error:', err);
        this.addingColumn = false;
        this.errorMessage = err?.error?.message || 'Unable to add Kanban column.';
        this.cdr.detectChanges();
      }
    });
  }

  startEditingColumn(column: KanbanColumn): void {
    if (!this.canEditTicket()) {
      return;
    }

    this.editingColumnId = column.id;
    this.editingColumnName = column.name;
    this.editingColumnWip = column.wip_limit ?? null;
    this.errorMessage = '';
    this.successMessage = '';

    this.cdr.detectChanges();
  }

  cancelEditingColumn(): void {
    this.editingColumnId = null;
    this.editingColumnName = '';
    this.editingColumnWip = null;
    this.cdr.detectChanges();
  }

  saveColumnName(column: KanbanColumn): void {
    const name = this.editingColumnName.trim();

    if (!name) {
      this.errorMessage = 'Column name cannot be empty.';
      this.cdr.detectChanges();
      return;
    }

    // Normalize the WIP limit: empty/0/negative means "no limit" (null).
    const wipLimit =
      this.editingColumnWip !== null && Number(this.editingColumnWip) > 0
        ? Number(this.editingColumnWip)
        : null;

    if (name === column.name && wipLimit === (column.wip_limit ?? null)) {
      this.cancelEditingColumn();
      return;
    }

    this.savingColumn = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.http.put<any>(
      `${this.apiUrl}/kanban-columns/${column.id}`,
      { name, wip_limit: wipLimit }
    ).subscribe({
      next: (res) => {
        const updatedColumn = res?.data ? res.data : res;

        this.kanbanColumns = this.kanbanColumns.map(item =>
          item.id === column.id ? { ...item, ...updatedColumn } : item
        );

        this.tickets = this.tickets.map(ticket => {
          if (ticket.kanban_column_id !== column.id) {
            return ticket;
          }

          return {
            ...ticket,
            kanban_column: {
              ...(ticket.kanban_column || column),
              ...updatedColumn
            }
          };
        });

        this.editingColumnId = null;
        this.editingColumnName = '';
        this.editingColumnWip = null;
        this.savingColumn = false;
        this.successMessage = 'Column updated successfully.';

        /*
        |--------------------------------------------------------------------------
        | Important Fix
        |--------------------------------------------------------------------------
        | Reload the board after renaming because the backend may clear the old
        | status_key. This prevents the UI from still displaying the old status,
        | like "Blocker" showing "Dev in Progress".
        */
        this.loadKanbanColumns();

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Rename column error:', err);
        this.savingColumn = false;
        this.errorMessage = err?.error?.message || 'Unable to rename column.';
        this.cdr.detectChanges();
      }
    });
  }

  deleteKanbanColumn(column: KanbanColumn): void {
    if (!this.canDeleteColumn(column)) {
      return;
    }

    const confirmed = confirm(`Delete column "${column.name}"?`);

    if (!confirmed) {
      return;
    }

    this.http.delete<any>(`${this.apiUrl}/kanban-columns/${column.id}`).subscribe({
      next: () => {
        this.successMessage = 'Kanban column deleted successfully.';
        this.errorMessage = '';
        this.loadKanbanColumns();
      },
      error: (err) => {
        console.error('Delete column error:', err);
        this.errorMessage = err?.error?.message || 'Unable to delete column.';
        this.cdr.detectChanges();
      }
    });
  }

  onDragStart(ticket: Ticket): void {
    this.draggedTicket = ticket;
    this.draggedColumn = null;
  }

  onDragEnd(): void {
    this.draggedTicket = null;
  }

  onColumnDragStart(event: DragEvent, column: KanbanColumn): void {
    if (!this.canEditTicket()) {
      event.preventDefault();
      return;
    }

    this.draggedColumn = column;
    this.draggedTicket = null;

    event.dataTransfer?.setData('text/plain', String(column.id));

    this.cdr.detectChanges();
  }

  onColumnDragEnd(): void {
    this.draggedColumn = null;
    this.columnDragOverId = null;
    this.cdr.detectChanges();
  }

  onDragOver(event: DragEvent, column?: KanbanColumn): void {
    event.preventDefault();

    if (this.draggedColumn && column) {
      this.columnDragOverId = column.id;
      this.cdr.detectChanges();
    }
  }

  onDrop(column: KanbanColumn): void {
    if (this.draggedColumn) {
      this.reorderColumnByDrop(column);
      return;
    }

    if (!this.draggedTicket) {
      return;
    }

    if (this.draggedTicket.kanban_column_id === column.id) {
      this.draggedTicket = null;
      return;
    }

    this.changeTicketColumn(this.draggedTicket, column);
    this.draggedTicket = null;
  }

  reorderColumnByDrop(targetColumn: KanbanColumn): void {
    if (!this.draggedColumn) {
      return;
    }

    if (this.draggedColumn.id === targetColumn.id) {
      this.onColumnDragEnd();
      return;
    }

    const oldColumns = [...this.kanbanColumns];

    const draggedIndex = this.kanbanColumns.findIndex(
      column => column.id === this.draggedColumn?.id
    );

    const targetIndex = this.kanbanColumns.findIndex(
      column => column.id === targetColumn.id
    );

    if (draggedIndex === -1 || targetIndex === -1) {
      this.onColumnDragEnd();
      return;
    }

    const reorderedColumns = [...this.kanbanColumns];
    const [removedColumn] = reorderedColumns.splice(draggedIndex, 1);
    reorderedColumns.splice(targetIndex, 0, removedColumn);

    this.kanbanColumns = reorderedColumns.map((column, index) => ({
      ...column,
      position: index + 1
    }));

    this.onColumnDragEnd();
    this.saveColumnOrder(oldColumns);
  }

  saveColumnOrder(oldColumns: KanbanColumn[]): void {
    const payload = {
      columns: this.kanbanColumns.map((column, index) => ({
        id: column.id,
        position: index + 1
      }))
    };

    this.reorderingColumns = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.http.put<any>(
      `${this.apiUrl}/projects/${this.workspaceId}/kanban-columns/reorder`,
      payload
    ).subscribe({
      next: (res) => {
        const updatedColumns = res?.data ? res.data : null;

        if (Array.isArray(updatedColumns)) {
          this.kanbanColumns = updatedColumns.sort(
            (a: KanbanColumn, b: KanbanColumn) => a.position - b.position
          );
        }

        this.reorderingColumns = false;
        this.successMessage = 'Column order updated successfully.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Reorder columns error:', err);

        this.kanbanColumns = oldColumns;
        this.reorderingColumns = false;
        this.errorMessage = err?.error?.message || 'Unable to reorder columns.';

        this.cdr.detectChanges();
      }
    });
  }

  changeTicketColumn(ticket: Ticket, newColumn: KanbanColumn): void {
    const oldColumnId = ticket.kanban_column_id;
    const oldStatus = ticket.status;
    const oldKanbanColumn = ticket.kanban_column;

    /*
    |--------------------------------------------------------------------------
    | Important Fix
    |--------------------------------------------------------------------------
    | For custom columns, do not force the ticket status to "todo".
    | Keep the existing status visually, but send the new kanban_column_id.
    | The backend will use the real column name for activity/email.
    */
    const newStatus = this.getStatusForColumn(newColumn, ticket.status);

    ticket.kanban_column_id = newColumn.id;
    ticket.kanban_column = newColumn;
    ticket.status = newStatus;

    this.cdr.detectChanges();

    const payload: any = {
      title: ticket.title,
      description: ticket.description || '',
      kanban_column_id: newColumn.id,
      epic_id: ticket.epic_id || null,
      priority: ticket.priority,
      assigned_to: ticket.assigned_to,
      due_date: ticket.due_date
    };

    /*
    |--------------------------------------------------------------------------
    | Only send status for system columns.
    |--------------------------------------------------------------------------
    | If Blocker is a custom column with status_key = null, status will not be
    | sent. This prevents backend/email from saying the ticket moved to an old
    | workflow status like Dev In Progress.
    */
    if (newColumn.status_key) {
      payload.status = newColumn.status_key;
    }

    this.http.put<any>(`${this.apiUrl}/tickets/${ticket.id}`, payload).subscribe({
      next: (res) => {
        const updatedTicket = res?.data ? res.data : res;

        if (updatedTicket.status === 'completed') {
          this.tickets = this.tickets.filter(item => item.id !== ticket.id);
        } else {
          this.tickets = this.tickets.map(item =>
            item.id === ticket.id ? updatedTicket : item
          );
        }

        if (this.selectedTicket?.id === ticket.id) {
          this.selectedTicket = updatedTicket;
        }

        this.successMessage = `Ticket moved to ${newColumn.name}.`;
        this.errorMessage = '';

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Move ticket error:', err);

        ticket.kanban_column_id = oldColumnId;
        ticket.kanban_column = oldKanbanColumn;
        ticket.status = oldStatus;

        this.errorMessage = err?.error?.message || 'Unable to move ticket.';
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
    if (updatedTicket.status === 'completed') {
      this.tickets = this.tickets.filter(ticket => ticket.id !== updatedTicket.id);
      this.closeTicketDetails();
      this.successMessage = 'Ticket moved to archive.';
      this.cdr.detectChanges();
      return;
    }

    const exists = this.tickets.some(ticket => ticket.id === updatedTicket.id);

    if (exists) {
      this.tickets = this.tickets.map(ticket =>
        ticket.id === updatedTicket.id ? updatedTicket : ticket
      );
    } else {
      this.tickets = [updatedTicket, ...this.tickets];
    }

    this.selectedTicket = updatedTicket;

    /*
    |--------------------------------------------------------------------------
    | Keep board fresh after modal edits.
    |--------------------------------------------------------------------------
    | This updates the card location, column data, assignee, epic, and status.
    */
    this.loadKanbanColumns();

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
    this.router.navigate(['/projects', this.workspaceId, 'archive']);
  }

  goToActivityLog(): void {
    this.router.navigate(['/projects', this.workspaceId, 'activity']);
  }

  goToTimesheet(): void {
    this.router.navigate(['/projects', this.workspaceId, 'timesheet']);
  }

  getBacklogColumn(): KanbanColumn | null {
    return this.kanbanColumns.find(column => column.is_backlog_column) || null;
  }

  getStatusForColumn(
    column: KanbanColumn | null | undefined,
    currentStatus: TicketStatus = 'todo'
  ): TicketStatus {
    if (!column) {
      return currentStatus || 'todo';
    }

    /*
    |--------------------------------------------------------------------------
    | System/default columns
    |--------------------------------------------------------------------------
    | Backlog, Done, and other untouched default columns may still have status_key.
    */
    if (column.status_key) {
      return column.status_key as TicketStatus;
    }

    /*
    |--------------------------------------------------------------------------
    | Custom columns
    |--------------------------------------------------------------------------
    | Do not return "todo" for custom columns.
    | Keep the ticket's current status so custom column moves are not mislabeled.
    */
    return currentStatus || 'todo';
  }

  getPlainText(html: string | null | undefined): string {
    if (!html) return '';

    const div = document.createElement('div');
    div.innerHTML = html;

    return div.textContent || div.innerText || '';
  }

  formatColumnSubtitle(column: KanbanColumn): string {
    if (column.is_backlog_column) {
      return 'Starting point for new tickets';
    }

    if (column.is_done_column) {
      return 'Finished board work';
    }

    /*
    |--------------------------------------------------------------------------
    | Important UI Fix
    |--------------------------------------------------------------------------
    | Do not display old hardcoded status labels for renamed/custom columns.
    | Example: "Blocker" should not display "Dev in Progress".
    */
    return 'Custom workflow column';
  }

  formatStatus(status: string | null | undefined): string {
    const labels: Record<string, string> = {
      todo: 'Backlog',
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

  formatRoleLabel(role: string | undefined): string {
    const labels: Record<string, string> = {
      owner: 'Project Manager',
      editor: 'User',
      viewer: 'Viewer / Read Only'
    };

    return role ? labels[role] || role : 'Member';
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
    if (Array.isArray(res?.columns)) return res.columns;
    if (Array.isArray(res?.data?.columns)) return res.data.columns;
    if (Array.isArray(res?.epics)) return res.epics;
    if (Array.isArray(res?.data?.epics)) return res.data.epics;

    return [];
  }
}