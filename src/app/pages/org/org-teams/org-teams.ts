import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrgService } from '../../../services/org/org.service';
import { PROJECT_ROLES } from '../org-roles';

@Component({
  selector: 'app-org-teams',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './org-teams.html',
  styleUrl: './org-teams.scss'
})
export class OrgTeams implements OnInit {
  teams = signal<any[]>([]);
  orgUsers = signal<any[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  showCreateModal = signal(false);
  submitting = signal(false);

  readonly projectRoles = PROJECT_ROLES;

  // Member management
  managingTeam = signal<any | null>(null);
  addingMember = signal(false);
  selectedUserId = signal<number | null>(null);
  selectedRole = signal<string>('developer');

  newTeam = { name: '', description: '', color: '#547a95', capacity_hours: null as number | null };

  constructor(private orgService: OrgService) {}

  ngOnInit(): void {
    this.loadTeams();
    this.loadUsers();
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

  loadUsers(): void {
    this.orgService.getUsers().subscribe({
      next: (res: any) => this.orgUsers.set(res.data ?? [])
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

  openManageMembers(team: any): void {
    this.error.set(null);
    this.selectedUserId.set(null);
    this.selectedRole.set('developer');
    this.managingTeam.set(team);
  }

  closeManageMembers(): void {
    this.managingTeam.set(null);
    this.selectedUserId.set(null);
    this.selectedRole.set('developer');
    this.error.set(null);
  }

  addMember(): void {
    const team = this.managingTeam();
    const userId = this.selectedUserId();
    if (!team || !userId) return;

    this.addingMember.set(true);
    this.error.set(null);

    this.orgService.addTeamMember(team.id, userId, this.selectedRole()).subscribe({
      next: (res: any) => {
        this.teams.update(ts => ts.map(t => t.id === team.id ? res.data : t));
        this.managingTeam.set(res.data);
        this.selectedUserId.set(null);
        this.selectedRole.set('developer');
        this.addingMember.set(false);
      },
      error: (err: any) => {
        this.error.set(err?.error?.message || 'Failed to add member.');
        this.addingMember.set(false);
      }
    });
  }

  removeMember(teamId: number, userId: number): void {
    if (!confirm('Remove this member from the team?')) return;
    this.orgService.removeTeamMember(teamId, userId).subscribe({
      next: (res: any) => {
        this.teams.update(ts => ts.map(t => t.id === teamId ? res.data : t));
        const managing = this.managingTeam();
        if (managing?.id === teamId) this.managingTeam.set(res.data);
      },
      error: (err: any) => this.error.set(err?.error?.message || 'Failed to remove member.')
    });
  }

  deleteTeam(team: any): void {
    if (!confirm(`Delete team "${team.name}"?`)) return;
    this.orgService.deleteTeam(team.id).subscribe({
      next: () => this.teams.update(t => t.filter(x => x.id !== team.id)),
      error: (err: any) => this.error.set(err?.error?.message || 'Failed to delete team.')
    });
  }

  availableUsers(team: any): any[] {
    const memberIds = new Set((team.members ?? []).map((m: any) => m.user?.id ?? m.user_id));
    return this.orgUsers().filter(u => !memberIds.has(u.id));
  }
}
