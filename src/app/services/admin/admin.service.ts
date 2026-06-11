import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

@Injectable({
  providedIn: 'root'
})
export class AdminService extends ApiService {

  getOrganizations(): Observable<any> {
    return this.get('/admin/organizations');
  }

  getOrganization(id: number): Observable<any> {
    return this.get(`/admin/organizations/${id}`);
  }

  createOrganization(data: any): Observable<any> {
    return this.post('/admin/organizations', data);
  }

  updateOrganization(id: number, data: any): Observable<any> {
    return this.put(`/admin/organizations/${id}`, data);
  }

  // Branding updates may include a logo file, so use multipart + method spoofing
  // (PHP only populates uploaded files on POST requests).
  updateOrganizationBranding(id: number, formData: FormData): Observable<any> {
    formData.append('_method', 'PUT');
    return this.post(`/admin/organizations/${id}`, formData);
  }

  getOrganizationBilling(id: number): Observable<any> {
    return this.get(`/admin/organizations/${id}/billing`);
  }

  deleteOrganization(id: number): Observable<any> {
    return this.delete(`/admin/organizations/${id}`);
  }

  getSubscriptionPlans(): Observable<any> {
    return this.get('/admin/subscription-plans');
  }

  createSubscriptionPlan(data: any): Observable<any> {
    return this.post('/admin/subscription-plans', data);
  }

  updateSubscriptionPlan(id: number, data: any): Observable<any> {
    return this.put(`/admin/subscription-plans/${id}`, data);
  }

  deleteSubscriptionPlan(id: number): Observable<any> {
    return this.delete(`/admin/subscription-plans/${id}`);
  }
}
