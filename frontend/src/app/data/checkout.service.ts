import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';

export interface CheckoutPayload {
  idempotencyKey: string;
  items: { productId: string; quantity: number }[];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fulfillment: 'DELIVERY' | 'PICKUP';
  addressLine1: string;
  postalCode: string;
  city: string;
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly http = inject(HttpClient);

  createCheckout(payload: CheckoutPayload): Observable<{ checkoutUrl: string }> {
    return this.http.get<{ token: string }>('/api/admin/csrf').pipe(
      switchMap(() => this.http.post<{ checkoutUrl: string }>('/api/orders/checkout', payload))
    );
  }
}
