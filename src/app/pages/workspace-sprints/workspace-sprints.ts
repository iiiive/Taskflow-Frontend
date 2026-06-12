import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Sprint {
  id: number;
  project_id: number;
  name: string;
  goal?: string | null;
  status: 'planning' | 'active' | 'completed';
  start_date?: string | null;
  end_date?: string | null;
  completed_at?: string | null;
  tickets_count?: number;
  total_story_points?: number;
  completed_story_points?: number;
}

@Component({
  selector: 'app-workspace-sprints',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './workspace-sprints.html',
  styleUrl: './workspace-sprints.scss',
})
export class WorkspaceSprints implements OnInit {
  private apiUrl = environment.apiUrl;

  projectId!: number;
  sprints: Sprint[] = [];
  loading = true;
  errorMessage = '';
  successMessage = '';

  showCreateModal = false;
  creating = false;

  newSprint = {
    name: '',
    goal: '',
    start_date: '',
    end_date: '',
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.projectId) {
      this.router.navigate(['/projects']);
      return;
    }
    this.loadSprints();
  }

  loadSprints(): void {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}/projects/${this.projectId}/sprints`).subscribe({
      next: (res) => {
        const raw = res?.data?.data ?? res?.data ?? [];
        this.sprints = Array.isArray(raw) ? raw : [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to load sprints.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  openCreateModal(): void {
    this.newSprint = { name: '', goal: '', start_date: '', end_date: '' };
    this.showCreateModal = true;
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.creating = false;
    this.cdr.detectChanges();
  }

  createSprint(): void {
    if (!this.newSprint.name.trim()) {
      this.errorMessage = 'Sprint name is required.';
      return;
    }
    this.creating = true;
    this.errorMessage = '';
    this.http.post<any>(`${this.apiUrl}/projects/${this.projectId}/sprints`, this.newSprint).subscribe({
      next: (res) => {
        const sprint = res?.data ?? res;
        this.sprints = [sprint, ...this.sprints];
        this.creating = false;
        this.showCreateModal = false;
        this.successMessage = 'Sprint created.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.creating = false;
        this.errorMessage = err?.error?.message || 'Unable to create sprint.';
        this.cdr.detectChanges();
      },
    });
  }

  startSprint(sprint: Sprint): void {
    if (!confirm(`Start sprint "${sprint.name}"?`)) return;
    this.http.post<any>(`${this.apiUrl}/sprints/${sprint.id}/start`, {}).subscribe({
      next: (res) => {
        const updated = res?.data ?? res;
        this.sprints = this.sprints.map(s => s.id === sprint.id ? updated : s);
        this.successMessage = 'Sprint started.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to start sprint.';
        this.cdr.detectChanges();
      },
    });
  }

  completeSprint(sprint: Sprint): void {
    if (!confirm(`Complete sprint "${sprint.name}"? Unfinished tickets will stay in the project.`)) return;
    this.http.post<any>(`${this.apiUrl}/sprints/${sprint.id}/complete`, {}).subscribe({
      next: (res) => {
        const updated = res?.data ?? res;
        this.sprints = this.sprints.map(s => s.id === sprint.id ? updated : s);
        this.successMessage = 'Sprint completed.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to complete sprint.';
        this.cdr.detectChanges();
      },
    });
  }

  deleteSprint(sprint: Sprint): void {
    if (!confirm(`Delete sprint "${sprint.name}"? Tickets will be unassigned from this sprint.`)) return;
    this.http.delete<any>(`${this.apiUrl}/sprints/${sprint.id}`).subscribe({
      next: () => {
        this.sprints = this.sprints.filter(s => s.id !== sprint.id);
        this.successMessage = 'Sprint deleted.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to delete sprint.';
        this.cdr.detectChanges();
      },
    });
  }

  progressPercent(sprint: Sprint): number {
    const total = sprint.total_story_points ?? 0;
    const done  = sprint.completed_story_points ?? 0;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }

  statusLabel(status: string): string {
    return { planning: 'Planning', active: 'Active', completed: 'Completed' }[status] ?? status;
  }

  goToBoard(): void {
    this.router.navigate(['/projects', this.projectId, 'board']);
  }
}
