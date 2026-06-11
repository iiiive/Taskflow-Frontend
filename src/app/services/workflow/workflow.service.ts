import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService extends ApiService {

  getWorkflows(projectId: number): Observable<any> {
    return this.get(`/projects/${projectId}/workflows`);
  }

  getWorkflow(id: number): Observable<any> {
    return this.get(`/workflows/${id}`);
  }

  createWorkflow(projectId: number, data: any): Observable<any> {
    return this.post(`/projects/${projectId}/workflows`, data);
  }

  updateWorkflow(id: number, data: any): Observable<any> {
    return this.put(`/workflows/${id}`, data);
  }

  deleteWorkflow(id: number): Observable<any> {
    return this.delete(`/workflows/${id}`);
  }

  addState(workflowId: number, data: any): Observable<any> {
    return this.post(`/workflows/${workflowId}/states`, data);
  }

  updateState(workflowId: number, stateId: number, data: any): Observable<any> {
    return this.put(`/workflows/${workflowId}/states/${stateId}`, data);
  }

  removeState(workflowId: number, stateId: number): Observable<any> {
    return this.delete(`/workflows/${workflowId}/states/${stateId}`);
  }

  addTransition(workflowId: number, data: any): Observable<any> {
    return this.post(`/workflows/${workflowId}/transitions`, data);
  }

  removeTransition(workflowId: number, transitionId: number): Observable<any> {
    return this.delete(`/workflows/${workflowId}/transitions/${transitionId}`);
  }

  activateWorkflow(id: number): Observable<any> {
    return this.post(`/workflows/${id}/activate`);
  }
}
