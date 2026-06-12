import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin/admin.service';

@Component({
  selector: 'app-admin-organizations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-organizations.html',
  styleUrl: './admin-organizations.scss'
})
export class AdminOrganizations implements OnInit {
  organizations = signal<any[]>([]);
  plans = signal<any[]>([]);
  loading = signal(true);
  showCreateModal = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);

  newOrg = { name: '', owner_name: '', owner_email: '', subscription_plan_id: '' };
  renewingId = signal<number | null>(null);

  // Branding / settings edit
  editingOrg = signal<any | null>(null);
  editForm = { name: '', owner_email: '', subscription_plan_id: '', primary_color: '#4f46e5', custom_domain: '' };
  logoFile: File | null = null;
  savingEdit = signal(false);

  // One-time credentials shown after org creation
  createdCredentials = signal<{ email: string; password: string } | null>(null);

  // Billing view
  billing = signal<any | null>(null);
  billingOrgName = signal<string>('');

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadOrganizations();
    this.loadPlans();
  }

  loadOrganizations(): void {
    this.adminService.getOrganizations().subscribe({
      next: (res: any) => {
        this.organizations.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadPlans(): void {
    this.adminService.getSubscriptionPlans().subscribe({
      next: (res: any) => this.plans.set(res.data ?? [])
    });
  }

  createOrganization(): void {
    this.submitting.set(true);
    this.error.set(null);
    this.adminService.createOrganization(this.newOrg).subscribe({
      next: (res: any) => {
        this.organizations.update(orgs => [res.data, ...orgs]);
        this.showCreateModal.set(false);
        this.createdCredentials.set({
          email: this.newOrg.owner_email,
          password: res.temporary_password
        });
        this.newOrg = { name: '', owner_name: '', owner_email: '', subscription_plan_id: '' };
        this.submitting.set(false);
      },
      error: (err: any) => {
        this.error.set(
          err?.error?.errors?.owner_email?.[0] || err?.error?.message || 'Failed to create organization.'
        );
        this.submitting.set(false);
      }
    });
  }

  copyCredentials(): void {
    const creds = this.createdCredentials();
    if (!creds) return;
    navigator.clipboard.writeText(`Email: ${creds.email}\nPassword: ${creds.password}`);
  }

  renewOrganization(org: any): void {
    if (!confirm(`Renew the subscription for "${org.name}"?`)) return;
    this.renewingId.set(org.id);
    this.adminService.renewOrganization(org.id).subscribe({
      next: (res: any) => {
        this.organizations.update(orgs => orgs.map(o => o.id === org.id ? res.data : o));
        this.renewingId.set(null);
      },
      error: (err: any) => {
        this.error.set(err?.error?.message || 'Failed to renew subscription.');
        this.renewingId.set(null);
      }
    });
  }

  toggleStatus(org: any): void {
    this.adminService.updateOrganization(org.id, { is_active: !org.is_active }).subscribe({
      next: (res: any) => {
        this.organizations.update(orgs =>
          orgs.map(o => o.id === org.id ? res.data : o)
        );
      }
    });
  }

  deleteOrganization(id: number): void {
    if (!confirm('Delete this organization? This cannot be undone.')) return;
    this.adminService.deleteOrganization(id).subscribe({
      next: () => {
        this.organizations.update(orgs => orgs.filter(o => o.id !== id));
      }
    });
  }

  openEdit(org: any): void {
    this.error.set(null);
    this.logoFile = null;
    this.editForm = {
      name: org.name ?? '',
      owner_email: org.owner_email ?? '',
      subscription_plan_id: org.subscription_plan?.id ?? '',
      primary_color: org.primary_color ?? '#4f46e5',
      custom_domain: org.custom_domain ?? ''
    };
    this.editingOrg.set(org);
  }

  closeEdit(): void {
    this.editingOrg.set(null);
    this.logoFile = null;
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.logoFile = input.files?.[0] ?? null;
  }

  saveBranding(): void {
    const org = this.editingOrg();
    if (!org) return;

    this.savingEdit.set(true);
    this.error.set(null);

    const formData = new FormData();
    formData.append('name', this.editForm.name);
    formData.append('owner_email', this.editForm.owner_email);
    if (this.editForm.subscription_plan_id) {
      formData.append('subscription_plan_id', String(this.editForm.subscription_plan_id));
    }
    if (this.editForm.primary_color) {
      formData.append('primary_color', this.editForm.primary_color);
    }
    formData.append('custom_domain', this.editForm.custom_domain ?? '');
    if (this.logoFile) {
      formData.append('logo', this.logoFile);
    }

    this.adminService.updateOrganizationBranding(org.id, formData).subscribe({
      next: (res: any) => {
        this.organizations.update(orgs => orgs.map(o => o.id === org.id ? res.data : o));
        this.savingEdit.set(false);
        this.closeEdit();
      },
      error: (err: any) => {
        this.error.set(err?.error?.message || 'Failed to update organization.');
        this.savingEdit.set(false);
      }
    });
  }

  openBilling(org: any): void {
    this.billing.set(null);
    this.billingOrgName.set(org.name);
    this.adminService.getOrganizationBilling(org.id).subscribe({
      next: (res: any) => this.billing.set(res.data),
      error: () => this.error.set('Failed to load billing details.')
    });
  }

  closeBilling(): void {
    this.billing.set(null);
  }

  usagePercent(used: number, limit: number | null): number {
    if (!limit || limit <= 0) return 0;
    return Math.min(100, Math.round((used / limit) * 100));
  }
}
