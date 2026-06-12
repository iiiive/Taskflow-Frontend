import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ProjectService } from '../../services/project/project.service';
import { ToastService } from '../../services/toast/toast.service';
import {
  PROJECT_TYPE_OPTIONS,
  PROJECT_TYPE_LABELS
} from '../../constants/planora.constants';

interface Workspace {
  id: number;
  owner_id?: number;
  name: string;
  description?: string | null;
  project_type?: string;
  project_mode?: string;
  is_template?: boolean;
  role?: string | null;
  can_manage_project?: boolean;
  can_edit?: boolean;
  can_manage_members?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

@Component({
  selector: 'app-workspaces',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './workspaces.html',
  styleUrl: './workspaces.scss',
})
export class Workspaces implements OnInit {
  workspaces: Workspace[] = [];

  name = '';
  description = '';
  projectType = 'software';
  projectMode = 'kanban';

  projectTypeOptions = PROJECT_TYPE_OPTIONS;

  loading = true;
  creating = false;
  errorMessage = '';
  successMessage = '';

  showCreateModal = false;

  // Project creation/deletion is reserved for organization administrators.
  // Workspace members (this page) provision nothing; PM/team-lead can manage.
  isOrgAdministrator = false;

  // Templates (clone / start-from-template)
  templates: Workspace[] = [];
  selectedTemplateId: number | '' = '';
  busyProjectId: number | null = null;

  projectTypeLabel(type?: string): string {
    return PROJECT_TYPE_LABELS[type ?? ''] ?? (type ?? '');
  }

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private projectService: ProjectService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.isOrgAdministrator = this.resolveIsOrgAdministrator();
    this.loadWorkspaces();
    this.loadTemplates();
  }

  private resolveIsOrgAdministrator(): boolean {
    try {
      const stored = localStorage.getItem('planora_user');
      if (!stored) {
        return false;
      }
      const user = JSON.parse(stored);
      return Boolean(user?.is_org_admin || user?.is_super_admin);
    } catch {
      return false;
    }
  }

  loadTemplates(): void {
    this.projectService.getTemplates().subscribe({
      next: (res) => {
        this.templates = this.extractWorkspaceArray(res);
        this.cdr.detectChanges();
      },
      error: () => {
        this.templates = [];
      }
    });
  }

  cloneWorkspace(workspace: Workspace): void {
    this.busyProjectId = workspace.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.projectService.cloneProject(workspace.id, {}).subscribe({
      next: (res) => {
        const clone = res?.data ? res.data : res;
        this.workspaces = [clone, ...this.workspaces];
        this.busyProjectId = null;
        this.toast.success(`"${workspace.name}" cloned successfully.`);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.busyProjectId = null;
        this.toast.error(err?.error?.message || 'Unable to clone project.');
        this.cdr.detectChanges();
      }
    });
  }

  saveWorkspaceAsTemplate(workspace: Workspace): void {
    this.busyProjectId = workspace.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.projectService.saveAsTemplate(workspace.id, {}).subscribe({
      next: () => {
        this.busyProjectId = null;
        this.toast.success(`Template created from "${workspace.name}".`);
        this.loadTemplates();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.busyProjectId = null;
        this.toast.error(err?.error?.message || 'Unable to create template.');
        this.cdr.detectChanges();
      }
    });
  }

  loadWorkspaces(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.http.get<any>(`${this.apiUrl}/projects`).subscribe({
      next: (res) => {
        this.workspaces = this.extractWorkspaceArray(res);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Workspaces API error:', err);

        this.loading = false;
        this.errorMessage =
          err?.error?.message ||
          'Unable to load workspaces. Please try again.';

        this.cdr.detectChanges();
      },
    });
  }

  extractWorkspaceArray(res: any): Workspace[] {
    if (Array.isArray(res)) {
      return res;
    }

    if (Array.isArray(res?.data)) {
      return res.data;
    }

    if (Array.isArray(res?.data?.data)) {
      return res.data.data;
    }

    if (Array.isArray(res?.workspaces)) {
      return res.workspaces;
    }

    return [];
  }

  openCreateModal(): void {
    this.showCreateModal = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.cdr.detectChanges();
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.name = '';
    this.description = '';
    this.projectType = 'software';
    this.projectMode = 'kanban';
    this.selectedTemplateId = '';
    this.errorMessage = '';

    this.cdr.detectChanges();
  }

  createWorkspace(): void {
    const cleanedName = this.name.trim();
    const cleanedDescription = this.description.trim();

    if (!cleanedName) {
      this.errorMessage = 'Workspace name is required.';
      this.successMessage = '';
      this.cdr.detectChanges();
      return;
    }

    this.creating = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request$ = this.selectedTemplateId
      ? this.projectService.createFromTemplate(Number(this.selectedTemplateId), { name: cleanedName })
      : this.projectService.createProject({
          name: cleanedName,
          description: cleanedDescription,
          project_type: this.projectType,
          project_mode: this.projectMode,
        });

    request$.subscribe({
      next: (res) => {
        const newWorkspace = res?.data ? res.data : res;

        this.workspaces = [newWorkspace, ...this.workspaces];

        this.name = '';
        this.description = '';
        this.projectType = 'software';
        this.projectMode = 'kanban';
        this.selectedTemplateId = '';

        this.creating = false;
        this.showCreateModal = false;
        this.toast.success('Workspace created successfully.');

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Create workspace error:', err);

        this.creating = false;
        this.errorMessage =
          err?.error?.message ||
          err?.error?.errors?.name?.[0] ||
          'Unable to create workspace. Please check your input.';
        this.toast.error(this.errorMessage);

        this.cdr.detectChanges();
      },
    });
  }

  openWorkspace(workspaceId: number): void {
    this.router.navigate(['/projects', workspaceId, 'board']);
  }

  deleteWorkspace(workspace: Workspace): void {
    const confirmed = confirm(
      `Are you sure you want to delete "${workspace.name}"?`
    );

    if (!confirmed) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.http.delete<any>(`${this.apiUrl}/projects/${workspace.id}`).subscribe({
      next: () => {
        this.workspaces = this.workspaces.filter(
          item => item.id !== workspace.id
        );

        this.toast.success('Workspace deleted successfully.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Delete workspace error:', err);

        this.toast.error(
          err?.error?.message ||
          'Unable to delete workspace. You may not have permission.'
        );

        this.cdr.detectChanges();
      },
    });
  }

  getWorkspaceInitial(workspace: Workspace): string {
    return workspace.name ? workspace.name.charAt(0).toUpperCase() : 'W';
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  }
}