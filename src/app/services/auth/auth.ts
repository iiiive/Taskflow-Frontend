import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  private getAuthHeaders() {
    const token = localStorage.getItem('token') || localStorage.getItem('planora_token');

    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    };
  }

  register(data: any) {
    return this.http.post(`${this.apiUrl}/store`, data);
  }

  login(data: any) {
    return this.http.post(`${this.apiUrl}/login`, data);
  }

  forgotPassword(data: any) {
    return this.http.post(`${this.apiUrl}/forgot-password`, data);
  }

  resetPassword(data: any) {
    return this.http.post(`${this.apiUrl}/reset-password`, data);
  }

  getGoogleRedirectUrl(): string {
    return `${this.apiUrl}/auth/google/redirect`;
  }

  getProfile() {
    return this.http.get(`${this.apiUrl}/profile`, {
      headers: this.getAuthHeaders()
    });
  }

  updateProfile(data: any) {
    return this.http.put(`${this.apiUrl}/profile`, data, {
      headers: this.getAuthHeaders()
    });
  }

  updateAvatar(formData: FormData) {
    return this.http.post(`${this.apiUrl}/profile/avatar`, formData, {
      headers: this.getAuthHeaders()
    });
  }

  removeAvatar() {
    return this.http.delete(`${this.apiUrl}/profile/avatar`, {
      headers: this.getAuthHeaders()
    });
  }

  logout() {
    return this.http.post(
      `${this.apiUrl}/logout`,
      {},
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  updatePassword(data: any) {
  return this.http.put(`${this.apiUrl}/profile/password`, data, {
    headers: this.getAuthHeaders()
  });
}
}