import { IssueType, ProjectType, TicketPriority } from '../interfaces/planora.interface';

export interface SelectOption<T> {
  value: T;
  label: string;
}

export const ISSUE_TYPE_OPTIONS: SelectOption<IssueType>[] = [
  { value: 'epic', label: 'Epic' },
  { value: 'story', label: 'Story' },
  { value: 'task', label: 'Task' },
  { value: 'subtask', label: 'Subtask' },
  { value: 'bug', label: 'Bug' },
  { value: 'incident', label: 'Incident' },
  { value: 'change_request', label: 'Change Request' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'improvement', label: 'Improvement' },
  { value: 'service_request', label: 'Support Ticket' },
  { value: 'other', label: 'Other' },
];

export const ISSUE_TYPE_LABELS: Record<string, string> = ISSUE_TYPE_OPTIONS.reduce(
  (map, option) => ({ ...map, [option.value]: option.label }),
  {} as Record<string, string>
);

// 'urgent' is stored in the DB but presented as "Critical" per the product spec.
export const PRIORITY_OPTIONS: SelectOption<TicketPriority>[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Critical' },
];

export const PRIORITY_LABELS: Record<string, string> = PRIORITY_OPTIONS.reduce(
  (map, option) => ({ ...map, [option.value]: option.label }),
  {} as Record<string, string>
);

export const PROJECT_TYPE_OPTIONS: SelectOption<ProjectType>[] = [
  { value: 'software', label: 'Software Development' },
  { value: 'it_support', label: 'IT Support' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'hr', label: 'HR' },
  { value: 'construction', label: 'Construction' },
  { value: 'general', label: 'General Tasks' },
];

export const PROJECT_TYPE_LABELS: Record<string, string> = PROJECT_TYPE_OPTIONS.reduce(
  (map, option) => ({ ...map, [option.value]: option.label }),
  {} as Record<string, string>
);

// Mirrors backend config/workflow.php required_field_options.
export const WORKFLOW_REQUIRED_FIELD_OPTIONS: SelectOption<string>[] = [
  { value: 'assigned_to', label: 'Assignee' },
  { value: 'due_date', label: 'Due Date' },
  { value: 'story_points', label: 'Story Points' },
  { value: 'description', label: 'Description' },
  { value: 'epic_id', label: 'Epic' },
  { value: 'priority', label: 'Priority' },
];

export const WORKFLOW_REQUIRED_FIELD_LABELS: Record<string, string> =
  WORKFLOW_REQUIRED_FIELD_OPTIONS.reduce(
    (map, option) => ({ ...map, [option.value]: option.label }),
    {} as Record<string, string>
  );
