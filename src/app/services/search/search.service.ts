import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

export interface SearchResultItem {
  id: number;
  type: string;
  label: string;
  sublabel?: string | null;
  route: string;
}

export interface SearchGroup {
  type: string;
  label: string;
  items: SearchResultItem[];
}

export interface SearchResponse {
  data: SearchGroup[];
}

@Injectable({ providedIn: 'root' })
export class SearchService extends ApiService {
  /** Global, role-scoped search. Backend enforces tenant isolation. */
  search(query: string): Observable<SearchResponse> {
    return this.get<SearchResponse>('/search', { q: query });
  }
}
