import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrgService } from '../../../services/org/org.service';

@Component({
  selector: 'app-org-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './org-users.html',
  styleUrl: './org-users.scss'
})
export class OrgUsers implements OnInit {
  users = signal<any[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  showCreateModal = signal(false);
  submitting = signal(false);

  newUser = { name: '', email: '' };

  constructor(private orgService: OrgService) {}

  ngOnInit(): void {
    this.loadUsers();
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
    this.showCreateModal.set(true);
  }

  createUser(): void {
    this.submitting.set(true);
    this.error.set(null);

    this.orgService.createUser({ name: this.newUser.name, email: this.newUser.email }).subscribe({
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
}
