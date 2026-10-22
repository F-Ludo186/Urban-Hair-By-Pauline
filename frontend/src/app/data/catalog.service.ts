import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  imageUrl: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  caption: string;
  category: string;
  imageUrl: string;
  instagramUrl: string | null;
  published: boolean;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api';

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/products`);
  }

  getGallery(): Observable<GalleryItem[]> {
    return this.http.get<GalleryItem[]>(`${this.apiUrl}/gallery`);
  }
}
