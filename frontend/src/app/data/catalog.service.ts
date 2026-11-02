import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  promotionPrice: number | null;
  sku: string | null;
  brand: string | null;
  productFormat: string | null;
  stockQuantity: number | null;
  published: boolean;
  featured: boolean;
  sortOrder: number;
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
  groupId: string | null;
  groupTitle: string | null;
  groupDescription: string | null;
  groupSortOrder: number;
  groupCoverItemId: string | null;
}

export interface ShopOptions {
  checkoutAvailable: boolean;
  deliveryAvailable: boolean;
  deliveryFee: number | null;
  deliveryZone: string;
  pickupAddress: string;
  pickupInstructions: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api';

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/products`);
  }

  getShopOptions(): Observable<ShopOptions> {
    return this.http.get<ShopOptions>(`${this.apiUrl}/shop/settings`);
  }

  getGallery(): Observable<GalleryItem[]> {
    return this.http.get<GalleryItem[]>(`${this.apiUrl}/gallery`);
  }
}
