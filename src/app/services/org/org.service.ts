import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

@Injectable({
  providedIn: 'root'
})
export class OrgService extends ApiService {

  getOverview(): Observable<any> {
    return this.get('/org/overview');
  }

  // Users
  getUsers(): Observable<any> {
    return this.get('/org/users');
  }

  createUser(data: any): Observable<any> {
    return this.post('/org/users', data);
  }

  updateUser(id: number, data: any): Observable<any> {
    return this.put(`/org/users/${id}`, data);
  }

  deleteUser(id: number): Observable<any> {
    return this.delete(`/org/users/${id}`);
  }

  // Projects
  getProjects(): Observable<any> {
    return this.get('/org/projects');
  }

  createProject(data: any): Observable<any> {
    return this.post('/org/projects', data);
  }

  deleteProject(id: number): Observable<any> {
    return this.delete(`/org/projects/${id}`);
  }

  assignTeam(projectId: number, teamId: number): Observable<any> {
    return this.post(`/org/projects/${projectId}/assign-team`, { team_id: teamId });
  }

  addProjectMember(projectId: number, userId: number, role: string): Observable<any> {
    return this.post(`/org/projects/${projectId}/members`, { user_id: userId, role });
  }

  removeProjectMember(projectId: number, userId: number): Observable<any> {
    return this.delete(`/org/projects/${projectId}/members/${userId}`);
  }

  // Teams
  getTeams(): Observable<any> {
    return this.get('/org/teams');
  }

  createTeam(data: any): Observable<any> {
    return this.post('/org/teams', data);
  }

  addTeamMember(teamId: number, userId: number, role: string = 'developer'): Observable<any> {
    return this.post(`/org/teams/${teamId}/members`, { user_id: userId, role });
  }

  removeTeamMember(teamId: number, userId: number): Observable<any> {
    return this.delete(`/org/teams/${teamId}/members/${userId}`);
  }

  deleteTeam(id: number): Observable<any> {
    return this.delete(`/org/teams/${id}`);
  }
}
