export type TicketStatus =
  | 'todo'
  | 'in_progress'
  | 'in_review'
  | 'ready_for_development'
  | 'dev_in_progress'
  | 'ready_for_testing'
  | 'ready_for_uat'
  | 'done'
  | 'completed';

export type TicketPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent';

export type WorkspaceRole =
  | 'owner'
  | 'editor'
  | 'viewer';

export interface PlanoraUser {
  id: number;
  name: string;
  email: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Epic {
  id: number;
  workspace_id: number;
  created_by: number;
  name: string;
  description?: string | null;
  color?: string | null;
  tickets_count?: number;
  creator?: PlanoraUser | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface KanbanColumn {
  id: number;
  workspace_id: number;
  name: string;
  slug: string;
  position: number;
  status_key?: TicketStatus | string | null;
  is_backlog_column: boolean;
  is_done_column: boolean;
  wip_limit?: number | null;
  tickets?: Ticket[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Workspace {
  id: number;
  owner_id: number;
  name: string;
  description?: string | null;
  role?: WorkspaceRole;
  role_label?: string;
  can_edit?: boolean;
  can_manage_members?: boolean;
  owner?: PlanoraUser;
  members?: WorkspaceMember[];
  kanban_columns?: KanbanColumn[];
  epics?: Epic[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface WorkspaceMember {
  id?: number;
  workspace_id?: number;
  user_id: number;
  role?: WorkspaceRole;
  role_label?: string;
  user?: PlanoraUser;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Ticket {
  id: number;
  workspace_id: number;
  kanban_column_id?: number | null;
  epic_id?: number | null;
  created_by: number;
  assigned_to: number | null;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  due_date: string | null;
  due_date_warning?: string | null;
  suggested_priority?: string | null;
  kanban_column?: KanbanColumn | null;
  epic?: Epic | null;
  creator?: PlanoraUser | null;
  assignee?: PlanoraUser | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TicketFormData {
  title: string;
  description: string;
  status: TicketStatus;
  kanban_column_id?: number | null;
  epic_id?: number | null;
  priority: TicketPriority;
  due_date: string | null;
  assigned_to: number | null;
}

export interface TicketComment {
  id: number;
  ticket_id: number;
  user_id: number;
  comment: string;
  user?: PlanoraUser;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TicketAttachment {
  id: number;
  ticket_id: number;
  user_id: number;
  file_name: string;
  file_path: string;
  file_type?: string | null;
  file_url?: string;
  user?: PlanoraUser;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ActivityLog {
  id: number;
  workspace_id: number;
  ticket_id: number | null;
  user_id: number | null;
  action: string;
  description: string;
  user?: PlanoraUser;
  ticket?: Ticket;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ApiResponse<T> {
  message?: string;
  data: T;
}