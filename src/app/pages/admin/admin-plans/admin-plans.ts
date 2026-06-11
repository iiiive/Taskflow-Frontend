import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppSidebar } from '../../../components/app-sidebar/app-sidebar';
import { AdminService } from '../../../services/admin/admin.service';

interface PlanForm {
  name: string;
  max_projects: number | null;
  max_members: number | null;
  storage_gb: number | null;
  duration_days: number | null;
}

@Component({
  selector: 'app-admin-plans',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebar],
  templateUrl: './admin-plans.html',
  styleUrl: './admin-plans.scss'
})
export class AdminPlans implements OnInit {
  plans = signal<any[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  showCreateModal = signal(false);
  submitting = signal(false);
  editingPlan = signal<any | null>(null);
  savingEdit = signal(false);

  newPlan: PlanForm = { name: '', max_projects: null, max_members: null, storage_gb: null, duration_days: null };
  editForm: PlanForm = { name: '', max_projects: null, max_members: null, storage_gb: null, duration_days: null };

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.adminService.getSubscriptionPlans().subscribe({
      next: (res: any) => {
        this.plans.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load plans.');
        this.loading.set(false);
      }
    });
  }

  createPlan(): void {
    this.submitting.set(true);
    this.error.set(null);
    this.adminService.createSubscriptionPlan(this.newPlan).subscribe({
      next: (res: any) => {
        this.plans.update(p => [res.data, ...p]);
        this.showCreateModal.set(false);
        this.newPlan = { name: '', max_projects: null, max_members: null, storage_gb: null, duration_days: null };
        this.submitting.set(false);
      },
      error: (err: any) => {
        this.error.set(err?.error?.message || 'Failed to create plan.');
        this.submitting.set(false);
      }
    });
  }

  openEdit(plan: any): void {
    this.error.set(null);
    this.editForm = {
      name: plan.name,
      max_projects: plan.max_projects ?? null,
      max_members: plan.max_members ?? null,
      storage_gb: plan.storage_gb ?? null,
      duration_days: plan.duration_days ?? null
    };
    this.editingPlan.set(plan);
  }

  saveEdit(): void {
    const plan = this.editingPlan();
    if (!plan) return;
    this.savingEdit.set(true);
    this.error.set(null);
    this.adminService.updateSubscriptionPlan(plan.id, this.editForm).subscribe({
      next: (res: any) => {
        this.plans.update(p => p.map(pl => pl.id === plan.id ? res.data : pl));
        this.savingEdit.set(false);
        this.editingPlan.set(null);
      },
      error: (err: any) => {
        this.error.set(err?.error?.message || 'Failed to update plan.');
        this.savingEdit.set(false);
      }
    });
  }

  deletePlan(id: number): void {
    if (!confirm('Delete this plan? Organizations using it will lose their plan assignment.')) return;
    this.adminService.deleteSubscriptionPlan(id).subscribe({
      next: () => this.plans.update(p => p.filter(pl => pl.id !== id))
    });
  }

  formatLimit(val: number | null | undefined): string {
    return val == null ? '∞' : String(val);
  }
}
