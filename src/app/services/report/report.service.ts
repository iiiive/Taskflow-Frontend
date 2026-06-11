import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

@Injectable({
  providedIn: 'root'
})
export class ReportService extends ApiService {

  getBurndown(projectId: number, sprintId: number): Observable<any> {
    return this.get(`/reports/projects/${projectId}/burndown`, { sprint_id: sprintId });
  }

  getVelocity(projectId: number): Observable<any> {
    return this.get(`/reports/projects/${projectId}/velocity`);
  }

  getSlaCompliance(projectId: number, params?: any): Observable<any> {
    return this.get(`/reports/projects/${projectId}/sla`, params);
  }

  getWorkload(projectId: number): Observable<any> {
    return this.get(`/reports/projects/${projectId}/workload`);
  }

  getIssueDistribution(projectId: number): Observable<any> {
    return this.get(`/reports/projects/${projectId}/distribution`);
  }

  getOverdueTickets(projectId: number): Observable<any> {
    return this.get(`/reports/projects/${projectId}/overdue`);
  }

  getAverageResolutionTime(projectId: number): Observable<any> {
    return this.get(`/reports/projects/${projectId}/resolution-time`);
  }

  getProjectProgress(projectId: number): Observable<any> {
    return this.get(`/reports/projects/${projectId}/progress`);
  }

  getResponseTime(projectId: number, params?: any): Observable<any> {
    return this.get(`/reports/projects/${projectId}/response-time`, params);
  }

  getAgentPerformance(projectId: number, params?: any): Observable<any> {
    return this.get(`/reports/projects/${projectId}/agent-performance`, params);
  }

  getSummary(projectId: number): Observable<any> {
    return this.get(`/reports/projects/${projectId}/summary`);
  }
}
