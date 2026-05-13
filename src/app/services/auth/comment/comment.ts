import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  getComments(ticketId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/tickets/${ticketId}/comments`);
  }

  addComment(ticketId: number, data: { comment: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/tickets/${ticketId}/comments`, data);
  }
}