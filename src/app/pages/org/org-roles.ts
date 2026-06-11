/**
 * The six assignable project roles, matching the backend WorkspaceMember::ROLES.
 */
export const PROJECT_ROLES: { value: string; label: string }[] = [
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'developer', label: 'Developer' },
  { value: 'tester', label: 'Tester' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'client', label: 'Client' },
];
