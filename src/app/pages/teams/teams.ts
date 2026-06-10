import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AppSidebar } from '../../components/app-sidebar/app-sidebar';

interface TeamMember {
  id: number;
  user_id: number;
  role: string;
  user?: { id: number; name: string; email: string };
}

interface Team {
  id: number;
  name: string;
  description?: string | null;
  color: string;
  project_id?: number | null;
  members_count?: number;
  creator?: { id: number; name: string };
  members?: TeamMember[];
}

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebar],
  templateUrl: './teams.html',
  styleUrl: './teams.scss',
})
export class Teams implements OnInit {
  teams: Team[] = [];
  loading = true;
  errorMessage = '';
  successMessage = '';

  showCreateModal = false;
  showDetailModal = false;
  creating = false;
  addingMember = false;

  selectedTeam: Team | null = null;

  newTeam = { name: '', description: '', color: '#547A95' };
  newMemberEmail = '';
  newMemberRole = 'member';

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadTeams();
  }

  loadTeams(): void {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}/teams`).subscribe({
      next: (res) => {
        this.teams = Array.isArray(res?.data?.data) ? res.data.data
          : Array.isArray(res?.data) ? res.data : [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to load teams.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  openCreateModal(): void {
    this.newTeam = { name: '', description: '', color: '#547A95' };
    this.showCreateModal = true;
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.creating = false;
    this.cdr.detectChanges();
  }

  createTeam(): void {
    if (!this.newTeam.name.trim()) {
      this.errorMessage = 'Team name is required.';
      return;
    }
    this.creating = true;
    this.errorMessage = '';
    this.http.post<any>(`${this.apiUrl}/teams`, this.newTeam).subscribe({
      next: (res) => {
        const team = res?.data ?? res;
        this.teams = [team, ...this.teams];
        this.creating = false;
        this.showCreateModal = false;
        this.successMessage = 'Team created successfully.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.creating = false;
        this.errorMessage = err?.error?.message || 'Unable to create team.';
        this.cdr.detectChanges();
      },
    });
  }

  openDetail(team: Team): void {
    this.selectedTeam = null;
    this.newMemberEmail = '';
    this.newMemberRole = 'member';
    this.errorMessage = '';
    this.successMessage = '';
    this.showDetailModal = true;
    this.http.get<any>(`${this.apiUrl}/teams/${team.id}`).subscribe({
      next: (res) => {
        this.selectedTeam = res?.data ?? res;
        this.cdr.detectChanges();
      },
    });
  }

  closeDetail(): void {
    this.showDetailModal = false;
    this.selectedTeam = null;
    this.cdr.detectChanges();
  }

  addMember(): void {
    if (!this.selectedTeam || !this.newMemberEmail.trim()) return;
    this.addingMember = true;
    this.errorMessage = '';
    this.http.post<any>(`${this.apiUrl}/teams/${this.selectedTeam.id}/members`, {
      email: this.newMemberEmail.trim(),
      role: this.newMemberRole,
    }).subscribe({
      next: (res) => {
        const member = res?.data ?? res;
        if (this.selectedTeam) {
          this.selectedTeam.members = [...(this.selectedTeam.members ?? []), member];
        }
        this.newMemberEmail = '';
        this.addingMember = false;
        this.successMessage = 'Member added.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.addingMember = false;
        this.errorMessage = err?.error?.message || 'Unable to add member.';
        this.cdr.detectChanges();
      },
    });
  }

  removeMember(member: TeamMember): void {
    if (!this.selectedTeam) return;
    if (!confirm(`Remove ${member.user?.name ?? 'this member'} from the team?`)) return;
    this.http.delete<any>(`${this.apiUrl}/teams/${this.selectedTeam.id}/members/${member.id}`).subscribe({
      next: () => {
        if (this.selectedTeam) {
          this.selectedTeam.members = (this.selectedTeam.members ?? []).filter(m => m.id !== member.id);
        }
        this.successMessage = 'Member removed.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to remove member.';
        this.cdr.detectChanges();
      },
    });
  }

  deleteTeam(team: Team): void {
    if (!confirm(`Delete team "${team.name}"?`)) return;
    this.http.delete<any>(`${this.apiUrl}/teams/${team.id}`).subscribe({
      next: () => {
        this.teams = this.teams.filter(t => t.id !== team.id);
        if (this.selectedTeam?.id === team.id) this.closeDetail();
        this.successMessage = 'Team deleted.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to delete team.';
        this.cdr.detectChanges();
      },
    });
  }

  getInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : 'T';
  }
}
