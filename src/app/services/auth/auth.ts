import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getAuthHeaders() {
    // Auth is cookie-based now; only the Accept header is needed (the global
    // interceptor adds withCredentials + the XSRF header).
    return {
      Accept: 'application/json'
    };
  }

  /**
   * Primes the Sanctum CSRF cookie. Required before any state-changing request
   * (login/register) so the XSRF-TOKEN cookie exists for Angular to echo back.
   */
  csrf(): Observable<unknown> {
    return this.http.get('/sanctum/csrf-cookie', { withCredentials: true });
  }

  register(data: any) {
    return this.csrf().pipe(
      switchMap(() => this.http.post(`${this.apiUrl}/store`, data))
    );
  }

  login(data: any) {
    return this.csrf().pipe(
      switchMap(() => this.http.post(`${this.apiUrl}/login`, data))
    );
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
    // Google OAuth endpoints are unversioned (/api/auth/google/*), matching the
    // backend redirect URI + Google Cloud Console config.
    const base = this.apiUrl.replace(/\/v1$/, '');
    return `${base}/auth/google/redirect`;
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