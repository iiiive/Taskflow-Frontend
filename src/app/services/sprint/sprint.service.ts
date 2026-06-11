import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

@Injectable({
  providedIn: 'root'
})
export class SprintService extends ApiService {

  getSprints(projectId: number, status?: string): Observable<any> {
    return this.get(`/projects/${projectId}/sprints`, status ? { status } : undefined);
  }

  getSprint(id: number): Observable<any> {
    return this.get(`/sprints/${id}`);
  }

  createSprint(projectId: number, data: any): Observable<any> {
    return this.post(`/projects/${projectId}/sprints`, data);
  }

  updateSprint(id: number, data: any): Observable<any> {
    return this.put(`/sprints/${id}`, data);
  }

  deleteSprint(id: number): Observable<any> {
    return this.delete(`/sprints/${id}`);
  }

  startSprint(id: number): Observable<any> {
    return this.post(`/sprints/${id}/start`);
  }

  completeSprint(id: number): Observable<any> {
    return this.post(`/sprints/${id}/complete`);
  }
}
