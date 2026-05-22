import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import {
  ApiResponse,
  Workspace,
  WorkspaceMember,
  WorkspaceRole
} from '../../interfaces/planora.interface';

@Component({
  selector: 'app-workspace-members-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './workspace-members-modal.html',
  styleUrl: './workspace-members-modal.scss'
})
export class WorkspaceMembersModal implements OnInit, OnChanges {
  @Input() workspaceId!: number;
  @Input() workspace: Workspace | null = null;
  @Input() apiUrl = 'http://127.0.0.1:8000/api';
  @Input() canManage = false;

  @Output() closeModal = new EventEmitter<void>();
  @Output() membersChanged = new EventEmitter<void>();

  members: WorkspaceMember[] = [];

  loadingMembers = false;
  addingMember = false;
  updatingMemberId: number | null = null;
  removingMemberId: number | null = null;

  errorMessage = '';
  successMessage = '';

  newMemberEmail = '';
  newMemberRole: Exclude<WorkspaceRole, 'owner'> = 'viewer';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadMembers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['workspaceId'] && !changes['workspaceId'].firstChange) {
      this.loadMembers();
    }
  }

  close(): void {
    this.closeModal.emit();
  }

  loadMembers(): void {
    if (!this.workspaceId) {
      return;
    }

    this.loadingMembers = true;
    this.errorMessage = '';

    this.http
      .get<ApiResponse<WorkspaceMember[]> | WorkspaceMember[] | any>(
        `${this.apiUrl}/workspaces/${this.workspaceId}/members`
      )
      .subscribe({
        next: (res) => {
          this.members = this.extractMembers(res);
          this.loadingMembers = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Load members error:', err);

          this.members = [];
          this.loadingMembers = false;
          this.errorMessage =
            err?.error?.message || 'Unable to load workspace members.';

          this.cdr.detectChanges();
        }
      });
  }

  addMember(): void {
    if (!this.canManage) {
      this.errorMessage = 'Only the project manager can add members.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.newMemberEmail.trim()) {
      this.errorMessage = 'Member email is required.';
      this.cdr.detectChanges();
      return;
    }

    const payload = {
      email: this.newMemberEmail.trim(),
      role: this.newMemberRole
    };

    this.addingMember = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.http
      .post<ApiResponse<WorkspaceMember> | WorkspaceMember | any>(
        `${this.apiUrl}/workspaces/${this.workspaceId}/members`,
        payload
      )
      .subscribe({
        next: () => {
          this.newMemberEmail = '';
          this.newMemberRole = 'viewer';
          this.addingMember = false;
          this.successMessage = 'Member added successfully.';

          this.loadMembers();
          this.membersChanged.emit();

          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Add member error:', err);

          this.addingMember = false;
          this.errorMessage =
            err?.error?.errors?.email?.[0] ||
            err?.error?.errors?.role?.[0] ||
            err?.error?.message ||
            'Unable to add member. Check the email and role.';

          this.cdr.detectChanges();
        }
      });
  }

  updateMemberRole(member: WorkspaceMember, role: WorkspaceRole): void {
    if (!this.canManage) {
      this.errorMessage = 'Only the project manager can update member roles.';
      this.cdr.detectChanges();
      return;
    }

    if (!member.id) {
      this.errorMessage = 'Invalid member record.';
      this.cdr.detectChanges();
      return;
    }

    if (member.role === 'owner') {
      this.errorMessage = 'Project manager role cannot be changed.';
      this.cdr.detectChanges();
      return;
    }

    if (role === 'owner') {
      this.errorMessage = 'You cannot assign project manager role from this modal.';
      this.cdr.detectChanges();
      return;
    }

    const previousRole = member.role;
    member.role = role;

    this.updatingMemberId = member.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.http
      .put<ApiResponse<WorkspaceMember> | WorkspaceMember | any>(
        `${this.apiUrl}/workspaces/${this.workspaceId}/members/${member.id}`,
        { role }
      )
      .subscribe({
        next: () => {
          this.updatingMemberId = null;
          this.successMessage = 'Member role updated successfully.';

          this.loadMembers();
          this.membersChanged.emit();

          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Update member role error:', err);

          member.role = previousRole;
          this.updatingMemberId = null;
          this.errorMessage =
            err?.error?.errors?.role?.[0] ||
            err?.error?.message ||
            'Unable to update member role.';

          this.cdr.detectChanges();
        }
      });
  }

  removeMember(member: WorkspaceMember): void {
    if (!this.canManage) {
      this.errorMessage = 'Only the project manager can remove members.';
      this.cdr.detectChanges();
      return;
    }

    if (!member.id) {
      this.errorMessage = 'Invalid member record.';
      this.cdr.detectChanges();
      return;
    }

    if (member.role === 'owner') {
      this.errorMessage = 'Project manager cannot be removed.';
      this.cdr.detectChanges();
      return;
    }

    const confirmed = confirm(`Remove ${this.getMemberName(member)} from this workspace?`);

    if (!confirmed) {
      return;
    }

    this.removingMemberId = member.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.http
      .delete(`${this.apiUrl}/workspaces/${this.workspaceId}/members/${member.id}`)
      .subscribe({
        next: () => {
          this.members = this.members.filter(item => item.id !== member.id);
          this.removingMemberId = null;
          this.successMessage = 'Member removed successfully.';

          this.membersChanged.emit();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Remove member error:', err);

          this.removingMemberId = null;
          this.errorMessage =
            err?.error?.message || 'Unable to remove member.';

          this.cdr.detectChanges();
        }
      });
  }

  extractMembers(res: any): WorkspaceMember[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.data?.data)) return res.data.data;
    if (Array.isArray(res?.members)) return res.members;
    if (Array.isArray(res?.data?.members)) return res.data.members;
    if (Array.isArray(res?.workspace_members)) return res.workspace_members;
    if (Array.isArray(res?.data?.workspace_members)) return res.data.workspace_members;

    return [];
  }

  getMemberName(member: WorkspaceMember): string {
    return member.user?.name || member.user?.email || `User #${member.user_id}`;
  }

  getMemberEmail(member: WorkspaceMember): string {
    return member.user?.email || 'No email available';
  }

  getMemberInitial(member: WorkspaceMember): string {
    return this.getMemberName(member).charAt(0).toUpperCase();
  }

  formatRole(role: string | undefined): string {
    const labels: Record<string, string> = {
      owner: 'Project Manager',
      editor: 'User',
      viewer: 'Viewer / Read Only'
    };

    return role ? labels[role] || role : 'Member';
  }

  isBusy(member: WorkspaceMember): boolean {
    return this.updatingMemberId === member.id || this.removingMemberId === member.id;
  }
}