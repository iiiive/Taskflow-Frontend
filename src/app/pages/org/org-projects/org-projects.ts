import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppSidebar } from '../../../components/app-sidebar/app-sidebar';
import { OrgService } from '../../../services/org/org.service';
import { PROJECT_ROLES } from '../org-roles';

interface MemberAssignment {
  user_id: number | null;
  role: string;
}

@Component({
  selector: 'app-org-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebar],
  templateUrl: './org-projects.html',
  styleUrl: './org-projects.scss'
})
export class OrgProjects implements OnInit {
  readonly roles = PROJECT_ROLES;

  projects = signal<any[]>([]);
  users = signal<any[]>([]);
  teams = signal<any[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  showCreateModal = signal(false);
  submitting = signal(false);

  newProject = { name: '', project_mode: 'kanban', team_id: null as number | null };
  members = signal<MemberAssignment[]>([]);
  draft: MemberAssignment = { user_id: null, role: 'developer' };

  constructor(private orgService: OrgService) {}

  ngOnInit(): void {
    this.loadProjects();
    this.orgService.getUsers().subscribe({ next: (res: any) => this.users.set(res.data ?? []) });
    this.orgService.getTeams().subscribe({ next: (res: any) => this.teams.set(res.data ?? []) });
  }

  loadProjects(): void {
    this.orgService.getProjects().subscribe({
      next: (res: any) => {
        this.projects.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load projects.');
        this.loading.set(false);
      }
    });
  }

  openCreate(): void {
    this.error.set(null);
    this.newProject = { name: '', project_mode: 'kanban', team_id: null };
    this.members.set([]);
    this.draft = { user_id: null, role: 'developer' };
    this.showCreateModal.set(true);
  }

  userName(id: number | null): string {
    return this.users().find(u => u.id === id)?.name ?? '';
  }

  roleLabel(value: string): string {
    return this.roles.find(r => r.value === value)?.label ?? value;
  }

  addMember(): void {
    if (!this.draft.user_id) return;
    if (this.members().some(m => m.user_id === this.draft.user_id)) return;
    this.members.update(list => [...list, { ...this.draft }]);
    this.draft = { user_id: null, role: 'developer' };
  }

  removeMember(index: number): void {
    this.members.update(list => list.filter((_, i) => i !== index));
  }

  createProject(): void {
    this.submitting.set(true);
    this.error.set(null);

    const payload: any = {
      name: this.newProject.name,
      project_mode: this.newProject.project_mode,
      members: this.members().map(m => ({ user_id: m.user_id, role: m.role }))
    };
    if (this.newProject.team_id) {
      payload.team_id = this.newProject.team_id;
    }

    this.orgService.createProject(payload).subscribe({
      next: (res: any) => {
        this.projects.update(p => [res.data, ...p]);
        this.showCreateModal.set(false);
        this.submitting.set(false);
      },
      error: (err: any) => {
        this.error.set(err?.error?.message || 'Failed to create project.');
        this.submitting.set(false);
      }
    });
  }

  deleteProject(project: any): void {
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    this.orgService.deleteProject(project.id).subscribe({
      next: () => this.projects.update(p => p.filter(x => x.id !== project.id)),
      error: (err: any) => this.error.set(err?.error?.message || 'Failed to delete project.')
    });
  }
}
