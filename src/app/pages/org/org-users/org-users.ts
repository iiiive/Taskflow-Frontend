import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppSidebar } from '../../../components/app-sidebar/app-sidebar';
import { OrgService } from '../../../services/org/org.service';
import { PROJECT_ROLES } from '../org-roles';

interface ProjectAssignment {
  project_id: number | null;
  role: string;
}

@Component({
  selector: 'app-org-users',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebar],
  templateUrl: './org-users.html',
  styleUrl: './org-users.scss'
})
export class OrgUsers implements OnInit {
  readonly roles = PROJECT_ROLES;

  users = signal<any[]>([]);
  projects = signal<any[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  showCreateModal = signal(false);
  submitting = signal(false);

  newUser = { name: '', email: '' };
  assignments = signal<ProjectAssignment[]>([]);
  draft: ProjectAssignment = { project_id: null, role: 'developer' };

  constructor(private orgService: OrgService) {}

  ngOnInit(): void {
    this.loadUsers();
    this.orgService.getProjects().subscribe({
      next: (res: any) => this.projects.set(res.data ?? [])
    });
  }

  loadUsers(): void {
    this.orgService.getUsers().subscribe({
      next: (res: any) => {
        this.users.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load users.');
        this.loading.set(false);
      }
    });
  }

  openCreate(): void {
    this.error.set(null);
    this.newUser = { name: '', email: '' };
    this.assignments.set([]);
    this.draft = { project_id: null, role: 'developer' };
    this.showCreateModal.set(true);
  }

  projectName(id: number | null): string {
    return this.projects().find(p => p.id === id)?.name ?? '';
  }

  addAssignment(): void {
    if (!this.draft.project_id) return;
    if (this.assignments().some(a => a.project_id === this.draft.project_id)) return;
    this.assignments.update(list => [...list, { ...this.draft }]);
    this.draft = { project_id: null, role: 'developer' };
  }

  removeAssignment(index: number): void {
    this.assignments.update(list => list.filter((_, i) => i !== index));
  }

  createUser(): void {
    this.submitting.set(true);
    this.error.set(null);

    const payload = {
      name: this.newUser.name,
      email: this.newUser.email,
      projects: this.assignments().map(a => ({ project_id: a.project_id, role: a.role }))
    };

    this.orgService.createUser(payload).subscribe({
      next: (res: any) => {
        this.users.update(u => [res.data, ...u]);
        this.showCreateModal.set(false);
        this.submitting.set(false);
      },
      error: (err: any) => {
        this.error.set(err?.error?.errors?.email?.[0] || err?.error?.message || 'Failed to create user.');
        this.submitting.set(false);
      }
    });
  }

  deleteUser(user: any): void {
    if (!confirm(`Remove ${user.name} from the organization?`)) return;
    this.orgService.deleteUser(user.id).subscribe({
      next: () => this.users.update(u => u.filter(x => x.id !== user.id)),
      error: (err: any) => this.error.set(err?.error?.message || 'Failed to remove user.')
    });
  }

  roleLabel(value: string): string {
    return this.roles.find(r => r.value === value)?.label ?? value;
  }
}
