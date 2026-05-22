import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  private getAuthHeaders() {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('planora_token');

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

  verifyTwoFactorLogin(data: {
    two_factor_token: string;
    code: string;
  }) {
    return this.http.post(`${this.apiUrl}/login/2fa`, data);
  }

  setupTwoFactor() {
    return this.http.post(
      `${this.apiUrl}/2fa/setup`,
      {},
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  confirmTwoFactor(data: { code: string }) {
    return this.http.post(`${this.apiUrl}/2fa/confirm`, data, {
      headers: this.getAuthHeaders()
    });
  }

  disableTwoFactor(data: { password: string }) {
    return this.http.post(`${this.apiUrl}/2fa/disable`, data, {
      headers: this.getAuthHeaders()
    });
  }

  regenerateRecoveryCodes() {
    return this.http.post(
      `${this.apiUrl}/2fa/recovery-codes/regenerate`,
      {},
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  forgotPassword(data: { email: string }) {
    return this.http.post(`${this.apiUrl}/forgot-password`, data);
  }

  resetPassword(data: {
    email: string;
    code: string;
    password: string;
    password_confirmation: string;
  }) {
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