import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

@Injectable({
  providedIn: 'root'
})
export class ProjectService extends ApiService {

  getProjects(): Observable<any> {
    return this.get('/projects');
  }

  getProject(id: number): Observable<any> {
    return this.get(`/projects/${id}`);
  }

  createProject(data: any): Observable<any> {
    return this.post('/projects', data);
  }

  updateProject(id: number, data: any): Observable<any> {
    return this.put(`/projects/${id}`, data);
  }

  deleteProject(id: number): Observable<any> {
    return this.delete(`/projects/${id}`);
  }

  archiveProject(id: number): Observable<any> {
    return this.post(`/projects/${id}/archive`);
  }

  unarchiveProject(id: number): Observable<any> {
    return this.post(`/projects/${id}/unarchive`);
  }

  cloneProject(id: number, data: { name?: string; with_issues?: boolean }): Observable<any> {
    return this.post(`/projects/${id}/clone`, data);
  }

  saveAsTemplate(id: number, data: { name?: string }): Observable<any> {
    return this.post(`/projects/${id}/save-as-template`, data);
  }

  getTemplates(): Observable<any> {
    return this.get('/projects/templates');
  }

  createFromTemplate(templateId: number, data: { name: string; with_issues?: boolean }): Observable<any> {
    return this.post(`/projects/from-template/${templateId}`, data);
  }

  getMembers(projectId: number): Observable<any> {
    return this.get(`/projects/${projectId}/members`);
  }

  addMember(projectId: number, data: any): Observable<any> {
    return this.post(`/projects/${projectId}/members`, data);
  }

  updateMember(projectId: number, memberId: number, data: any): Observable<any> {
    return this.put(`/projects/${projectId}/members/${memberId}`, data);
  }

  removeMember(projectId: number, memberId: number): Observable<any> {
    return this.delete(`/projects/${projectId}/members/${memberId}`);
  }
}
