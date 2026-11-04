import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface HomeSection {
  id: 'hero' | 'intro' | 'feature' | 'quote';
  eyebrow: string;
  title: string;
  body: string;
  linkLabel: string;
  linkUrl: string;
  signature: string;
  layout: string;
  sortOrder: number;
  imageUrl: string | null;
}

@Injectable({ providedIn: 'root' })
export class HomeContentService {
  private readonly http = inject(HttpClient);

  getSections(): Observable<HomeSection[]> {
    return this.http.get<HomeSection[]>('/api/home');
  }
}
