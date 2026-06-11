import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppSidebar } from '../../../components/app-sidebar/app-sidebar';
import { OrgService } from '../../../services/org/org.service';

@Component({
  selector: 'app-org-teams',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebar],
  templateUrl: './org-teams.html',
  styleUrl: './org-teams.scss'
})
export class OrgTeams implements OnInit {
  teams = signal<any[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  showCreateModal = signal(false);
  submitting = signal(false);

  newTeam = { name: '', description: '', color: '#547a95', capacity_hours: null as number | null };

  constructor(private orgService: OrgService) {}

  ngOnInit(): void {
    this.loadTeams();
  }

  loadTeams(): void {
    this.orgService.getTeams().subscribe({
      next: (res: any) => {
        this.teams.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load teams.');
        this.loading.set(false);
      }
    });
  }

  openCreate(): void {
    this.error.set(null);
    this.newTeam = { name: '', description: '', color: '#547a95', capacity_hours: null };
    this.showCreateModal.set(true);
  }

  createTeam(): void {
    this.submitting.set(true);
    this.error.set(null);

    this.orgService.createTeam(this.newTeam).subscribe({
      next: (res: any) => {
        this.teams.update(t => [res.data, ...t]);
        this.showCreateModal.set(false);
        this.submitting.set(false);
      },
      error: (err: any) => {
        this.error.set(err?.error?.message || 'Failed to create team.');
        this.submitting.set(false);
      }
    });
  }

  deleteTeam(team: any): void {
    if (!confirm(`Delete team "${team.name}"?`)) return;
    this.orgService.deleteTeam(team.id).subscribe({
      next: () => this.teams.update(t => t.filter(x => x.id !== team.id)),
      error: (err: any) => this.error.set(err?.error?.message || 'Failed to delete team.')
    });
  }
}
