import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppSidebar } from '../../../components/app-sidebar/app-sidebar';
import { AdminService } from '../../../services/admin/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, AppSidebar],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss'
})
export class AdminDashboard implements OnInit {
  organizations = signal<any[]>([]);
  plans = signal<any[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  activeOrgs = computed(() => this.organizations().filter(o => o.is_active).length);

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.adminService.getOrganizations().subscribe({
      next: (res: any) => {
        this.organizations.set(res.data ?? []);
        this.adminService.getSubscriptionPlans().subscribe({
          next: (r: any) => {
            this.plans.set(r.data ?? []);
            this.loading.set(false);
          },
          error: () => this.loading.set(false)
        });
      },
      error: () => {
        this.error.set('Failed to load data.');
        this.loading.set(false);
      }
    });
  }
}
