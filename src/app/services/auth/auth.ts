import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  constructor(private http: HttpClient) {}

  register(data: any) {
    return this.http.post('http://127.0.0.1:8000/api/store', data);
  }

  login(data: any) {
    return this.http.post('http://127.0.0.1:8000/api/login', data);
  }

  getProfile() {
    const token = localStorage.getItem('token');

    return this.http.get('http://127.0.0.1:8000/api/profile',{
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });
  }
}
