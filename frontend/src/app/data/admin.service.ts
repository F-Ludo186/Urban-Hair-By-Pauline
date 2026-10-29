import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';

export interface AdminGalleryItem {
  id: string;
  title: string;
  caption: string;
  category: string;
  imageUrl: string;
  instagramUrl: string | null;
  published: boolean;
  groupId: string | null;
  groupTitle: string | null;
}

export interface AdminGalleryGroup { id: string; title: string; itemCount: number; }

export interface GalleryFormValue {
  title: string;
  caption: string;
  category: string;
  instagramUrl: string;
  published: boolean;
  groupId: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  isAuthenticated(): Observable<boolean> {
    return this.http.get<{ username: string }>('/api/admin/me').pipe(
      map(() => true)
    );
  }

  login(username: string, password: string): Observable<void> {
    return this.http.get<{ token: string }>('/api/admin/csrf').pipe(
      switchMap(() => this.http.post<void>('/api/admin/login', { username, password }))
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/admin/logout', {});
  }

  getGallery(): Observable<AdminGalleryItem[]> {
    return this.http.get<AdminGalleryItem[]>('/api/admin/gallery');
  }

  getGalleryGroups(): Observable<AdminGalleryGroup[]> {
    return this.http.get<AdminGalleryGroup[]>('/api/admin/gallery/groups');
  }

  createGalleryGroup(title: string): Observable<AdminGalleryGroup> {
    return this.http.post<AdminGalleryGroup>('/api/admin/gallery/groups', { title });
  }

  updateGalleryGroup(id: string, title: string): Observable<AdminGalleryGroup> {
    return this.http.put<AdminGalleryGroup>(`/api/admin/gallery/groups/${encodeURIComponent(id)}`, { title });
  }

  deleteGalleryGroup(id: string): Observable<void> {
    return this.http.delete<void>(`/api/admin/gallery/groups/${encodeURIComponent(id)}`);
  }

  assignGalleryItemsToGroup(id: string, ids: string[]): Observable<void> {
    return this.http.put<void>(`/api/admin/gallery/groups/${encodeURIComponent(id)}/items`, { ids });
  }

  createGalleryItem(value: GalleryFormValue, image: File): Observable<AdminGalleryItem> {
    return this.http.post<AdminGalleryItem>('/api/admin/gallery', this.toFormData(value, image));
  }

  updateGalleryItem(id: string, value: GalleryFormValue, image?: File): Observable<AdminGalleryItem> {
    return this.http.put<AdminGalleryItem>(
      `/api/admin/gallery/${encodeURIComponent(id)}`,
      this.toFormData(value, image)
    );
  }

  deleteGalleryItem(id: string): Observable<void> {
    return this.http.delete<void>(`/api/admin/gallery/${encodeURIComponent(id)}`);
  }

  reorderGallery(ids: string[]): Observable<void> {
    return this.http.put<void>('/api/admin/gallery/order', { ids });
  }

  private toFormData(value: GalleryFormValue, image?: File): FormData {
    const formData = new FormData();
    formData.append('title', value.title);
    formData.append('caption', value.caption);
    formData.append('category', value.category);
    formData.append('instagramUrl', value.instagramUrl);
    formData.append('published', String(value.published));
    formData.append('groupId', value.groupId ?? '');
    if (image) {
      formData.append('image', image);
    }
    return formData;
  }
}
