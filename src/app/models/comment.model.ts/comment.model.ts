import { User } from './user.model';

export interface TicketComment {
  id: number;
  ticket_id: number;
  user_id: number;
  comment: string;
  user?: User;
  created_at: string;
  updated_at: string;
}