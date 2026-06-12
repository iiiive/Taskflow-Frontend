import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrgService } from '../../../services/org/org.service';

@Component({
  selector: 'app-org-overview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './org-overview.html',
  styleUrl: './org-overview.scss'
})
export class OrgOverview implements OnInit {
  organization = signal<any | null>(null);
  counts = signal<{ projects: number; users: number; teams: number }>({ projects: 0, users: 0, teams: 0 });
  loading = signal(true);
  error = signal<string | null>(null);

  constructor(private orgService: OrgService) {}

  ngOnInit(): void {
    this.orgService.getOverview().subscribe({
      next: (res: any) => {
        this.organization.set(res.data?.organization ?? null);
        this.counts.set(res.data?.counts ?? { projects: 0, users: 0, teams: 0 });
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load organization overview.');
        this.loading.set(false);
      }
    });
  }
}
