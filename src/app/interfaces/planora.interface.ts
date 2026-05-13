export type TicketStatus =
  | 'todo'
  | 'ready_for_development'
  | 'dev_in_progress'
  | 'ready_for_testing'
  | 'ready_for_uat'
  | 'done';

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

export interface Workspace {
  id: number;
  owner_id: number;
  name: string;
  description?: string | null;
  role?: WorkspaceRole;
  owner?: PlanoraUser;
  members?: WorkspaceMember[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface WorkspaceMember {
  id?: number;
  workspace_id?: number;
  user_id: number;
  role?: WorkspaceRole;
  user?: PlanoraUser;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Ticket {
  id: number;
  workspace_id: number;
  created_by: number;
  assigned_to: number | null;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  due_date: string | null;
  due_date_warning?: string | null;
  suggested_priority?: string | null;
  creator?: PlanoraUser | null;
  assignee?: PlanoraUser | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TicketFormData {
  title: string;
  description: string;
  status: TicketStatus;
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