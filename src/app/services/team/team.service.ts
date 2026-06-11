import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

@Injectable({
  providedIn: 'root'
})
export class TeamService extends ApiService {

  getTeams(): Observable<any> {
    return this.get('/teams');
  }

  getTeam(id: number): Observable<any> {
    return this.get(`/teams/${id}`);
  }

  createTeam(data: any): Observable<any> {
    return this.post('/teams', data);
  }

  updateTeam(id: number, data: any): Observable<any> {
    return this.put(`/teams/${id}`, data);
  }

  deleteTeam(id: number): Observable<any> {
    return this.delete(`/teams/${id}`);
  }

  addMember(teamId: number, data: any): Observable<any> {
    return this.post(`/teams/${teamId}/members`, data);
  }

  updateMember(teamId: number, memberId: number, data: any): Observable<any> {
    return this.put(`/teams/${teamId}/members/${memberId}`, data);
  }

  removeMember(teamId: number, memberId: number): Observable<any> {
    return this.delete(`/teams/${teamId}/members/${memberId}`);
  }
}
