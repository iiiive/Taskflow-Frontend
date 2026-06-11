import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../services/report/report.service';
import { SprintService } from '../../services/sprint/sprint.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.scss'
})
export class Reports implements OnInit {
  private route = inject(ActivatedRoute);
  private reportService = inject(ReportService);
  private sprintService = inject(SprintService);

  projectId = signal<number>(0);
  activeTab = signal<string>('distribution');

  sprints = signal<any[]>([]);
  selectedSprintId = signal<number | null>(null);

  loading = signal(false);
  error = signal<string | null>(null);

  distribution = signal<any>(null);
  velocity = signal<any>(null);
  workload = signal<any>(null);
  burndown = signal<any>(null);
  overdue = signal<any[]>([]);
  sla = signal<any>(null);
  resolutionTime = signal<any>(null);
  summary = signal<any>(null);
  progress = signal<any>(null);
  responseTime = signal<any>(null);
  agentPerformance = signal<any[]>([]);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.projectId.set(id);
    this.loadSprints();
    this.loadTab('overview');
  }

  loadSprints(): void {
    this.sprintService.getSprints(this.projectId()).subscribe({
      next: (res: any) => {
        const list = res.data ?? [];
        this.sprints.set(list);
        const active = list.find((s: any) => s.status === 'active') ?? list[0];
        if (active) this.selectedSprintId.set(active.id);
      }
    });
  }

  loadTab(tab: string): void {
    this.activeTab.set(tab);
    this.loading.set(true);
    this.error.set(null);

    const id = this.projectId();

    const calls: Record<string, () => void> = {
      distribution: () => this.reportService.getIssueDistribution(id).subscribe({
        next: (r: any) => { this.distribution.set(r.data); this.loading.set(false); },
        error: () => this.onError()
      }),
      velocity: () => this.reportService.getVelocity(id).subscribe({
        next: (r: any) => { this.velocity.set(r.data); this.loading.set(false); },
        error: () => this.onError()
      }),
      workload: () => this.reportService.getWorkload(id).subscribe({
        next: (r: any) => { this.workload.set(r.data); this.loading.set(false); },
        error: () => this.onError()
      }),
      burndown: () => {
        const sprintId = this.selectedSprintId();
        if (!sprintId) { this.loading.set(false); return; }
        this.reportService.getBurndown(id, sprintId).subscribe({
          next: (r: any) => { this.burndown.set(r.data); this.loading.set(false); },
          error: () => this.onError()
        });
      },
      overdue: () => this.reportService.getOverdueTickets(id).subscribe({
        next: (r: any) => { this.overdue.set(r.data ?? []); this.loading.set(false); },
        error: () => this.onError()
      }),
      sla: () => this.reportService.getSlaCompliance(id).subscribe({
        next: (r: any) => { this.sla.set(r.data); this.loading.set(false); },
        error: () => this.onError()
      }),
      overview: () => this.reportService.getSummary(id).subscribe({
        next: (r: any) => { this.summary.set(r.data); this.loading.set(false); },
        error: () => this.onError()
      }),
      progress: () => this.reportService.getProjectProgress(id).subscribe({
        next: (r: any) => { this.progress.set(r.data); this.loading.set(false); },
        error: () => this.onError()
      }),
      response_time: () => this.reportService.getResponseTime(id).subscribe({
        next: (r: any) => { this.responseTime.set(r.data); this.loading.set(false); },
        error: () => this.onError()
      }),
      agent_performance: () => this.reportService.getAgentPerformance(id).subscribe({
        next: (r: any) => { this.agentPerformance.set(r.data ?? []); this.loading.set(false); },
        error: () => this.onError()
      }),
    };

    (calls[tab] ?? (() => this.loading.set(false)))();
  }

  onError(): void {
    this.error.set('Failed to load report data.');
    this.loading.set(false);
  }

  objectEntries(obj: any): [string, any][] {
    return obj ? Object.entries(obj) : [];
  }
}
