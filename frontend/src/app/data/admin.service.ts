import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { Product } from './catalog.service';
import { HomeSection } from './home-content.service';

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
  groupDescription: string | null;
  groupSortOrder: number;
  groupCoverItemId: string | null;
}

export interface AdminGalleryGroup { id: string; title: string; description: string; itemCount: number; sortOrder: number; coverItemId: string | null; }

export interface GalleryFormValue {
  title: string;
  caption: string;
  category: string;
  instagramUrl: string;
  published: boolean;
  groupId: string | null;
}

export interface ProductFormValue {
  name: string;
  category: string;
  description: string;
  price: number;
  promotionPrice: number | null;
  sku: string;
  brand: string;
  productFormat: string;
  stockQuantity: number | null;
  published: boolean;
  featured: boolean;
}

export interface ShopSettings {
  notificationEmail: string;
  deliveryFee: number | null;
  deliveryZone: string;
  deliveryPostalPrefixes: string;
  pickupAddress: string;
  pickupInstructions: string;
}

export interface AdminShopSettings {
  settings: ShopSettings;
  paymentConfigured: boolean;
  mailConfigured: boolean;
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

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>('/api/admin/products');
  }

  getShopSettings(): Observable<AdminShopSettings> {
    return this.http.get<AdminShopSettings>('/api/admin/shop-settings');
  }

  getHomeSections(): Observable<HomeSection[]> {
    return this.http.get<HomeSection[]>('/api/admin/home');
  }

  saveHomeSection(section: HomeSection, image?: File, removeImage = false): Observable<HomeSection> {
    const formData = new FormData();
    formData.append('eyebrow', section.eyebrow);
    formData.append('title', section.title);
    formData.append('body', section.body);
    formData.append('linkLabel', section.linkLabel);
    formData.append('linkUrl', section.linkUrl);
    formData.append('signature', section.signature);
    formData.append('layout', section.layout);
    formData.append('removeImage', String(removeImage));
    if (image) formData.append('image', image);
    return this.http.put<HomeSection>(`/api/admin/home/${encodeURIComponent(section.id)}`, formData);
  }

  reorderHomeSections(ids: string[]): Observable<void> {
    return this.http.put<void>('/api/admin/home/sections/order', { ids });
  }

  saveShopSettings(settings: ShopSettings): Observable<AdminShopSettings> {
    return this.http.put<AdminShopSettings>('/api/admin/shop-settings', settings);
  }

  createProduct(value: ProductFormValue, image: File): Observable<Product> {
    return this.http.post<Product>('/api/admin/products', this.toProductFormData(value, image));
  }

  updateProduct(id: string, value: ProductFormValue, image?: File): Observable<Product> {
    return this.http.put<Product>(
      `/api/admin/products/${encodeURIComponent(id)}`,
      this.toProductFormData(value, image)
    );
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`/api/admin/products/${encodeURIComponent(id)}`);
  }

  reorderProducts(ids: string[]): Observable<void> {
    return this.http.put<void>('/api/admin/products/order', { ids });
  }

  createGalleryGroup(title: string, description = ''): Observable<AdminGalleryGroup> {
    return this.http.post<AdminGalleryGroup>('/api/admin/gallery/groups', { title, description });
  }

  updateGalleryGroup(id: string, title: string, description = ''): Observable<AdminGalleryGroup> {
    return this.http.put<AdminGalleryGroup>(`/api/admin/gallery/groups/${encodeURIComponent(id)}`, { title, description });
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

  reorderGalleryGroups(ids: string[]): Observable<void> {
    return this.http.put<void>('/api/admin/gallery/groups/order', { ids });
  }

  setGalleryGroupCover(id: string, itemId: string): Observable<AdminGalleryGroup> {
    return this.http.put<AdminGalleryGroup>(`/api/admin/gallery/groups/${encodeURIComponent(id)}/cover`, { itemId });
  }

  reorderGalleryGroupItems(id: string, ids: string[]): Observable<void> {
    return this.http.put<void>(`/api/admin/gallery/groups/${encodeURIComponent(id)}/items/order`, { ids });
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

  private toProductFormData(value: ProductFormValue, image?: File): FormData {
    const formData = new FormData();
    formData.append('name', value.name);
    formData.append('category', value.category);
    formData.append('description', value.description);
    formData.append('price', String(value.price));
    formData.append('promotionPrice', value.promotionPrice == null ? '' : String(value.promotionPrice));
    formData.append('sku', value.sku);
    formData.append('brand', value.brand);
    formData.append('productFormat', value.productFormat);
    formData.append('stockQuantity', value.stockQuantity == null ? '' : String(value.stockQuantity));
    formData.append('published', String(value.published));
    formData.append('featured', String(value.featured));
    if (image) formData.append('image', image);
    return formData;
  }
}
