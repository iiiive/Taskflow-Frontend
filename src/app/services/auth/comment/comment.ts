import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getComments(ticketId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/tickets/${ticketId}/comments`);
  }

  addComment(ticketId: number, data: { comment: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/tickets/${ticketId}/comments`, data);
  }
}