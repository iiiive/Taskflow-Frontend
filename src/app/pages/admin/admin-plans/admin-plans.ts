import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin/admin.service';
import { ToastService } from '../../../services/toast/toast.service';

interface PlanForm {
  name: string;
  max_projects: number | null;
  max_members: number | null;
  duration_days: number | null;
}

@Component({
  selector: 'app-admin-plans',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  newPlan: PlanForm = { name: '', max_projects: null, max_members: null, duration_days: null };
  editForm: PlanForm = { name: '', max_projects: null, max_members: null, duration_days: null };

  constructor(
    private adminService: AdminService,
    private toast: ToastService
  ) {}

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
        this.newPlan = { name: '', max_projects: null, max_members: null, duration_days: null };
        this.submitting.set(false);
        this.toast.success('Subscription plan created.');
      },
      error: (err: any) => {
        const message = err?.error?.message || 'Failed to create plan.';
        this.error.set(message);
        this.toast.error(message);
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
        this.toast.success('Subscription plan updated.');
      },
      error: (err: any) => {
        const message = err?.error?.message || 'Failed to update plan.';
        this.error.set(message);
        this.toast.error(message);
        this.savingEdit.set(false);
      }
    });
  }

  deletePlan(plan: any): void {
    if ((plan.organizations_count ?? 0) > 0) {
      this.toast.error(
        `"${plan.name}" is in use by ${plan.organizations_count} organization(s) and cannot be deleted. Reassign or expire those organizations first.`
      );
      return;
    }
    if (!confirm(`Delete the "${plan.name}" plan?`)) return;
    this.error.set(null);
    this.adminService.deleteSubscriptionPlan(plan.id).subscribe({
      next: () => {
        this.plans.update(p => p.filter(pl => pl.id !== plan.id));
        this.toast.success(`"${plan.name}" plan deleted.`);
      },
      error: (err: any) =>
        this.toast.error(err?.error?.message || 'Failed to delete plan.')
    });
  }

  planInUse(plan: any): boolean {
    return (plan.organizations_count ?? 0) > 0;
  }

  formatLimit(val: number | null | undefined): string {
    return val == null ? '∞' : String(val);
  }
}
