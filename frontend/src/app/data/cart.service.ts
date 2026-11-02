import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CartItem {
  productId: string;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly storageKey = 'urbanhair-cart-v1';
  private storageAvailable = true;
  private readonly itemsSubject = new BehaviorSubject<CartItem[]>(this.readCart());
  private readonly panelOpenSubject = new BehaviorSubject(false);

  readonly items$ = this.itemsSubject.asObservable();

  get isPanelOpen(): boolean {
    return this.panelOpenSubject.value;
  }

  get items(): CartItem[] {
    return this.itemsSubject.value;
  }

  get canPersist(): boolean {
    return this.storageAvailable;
  }

  togglePanel(): void {
    this.panelOpenSubject.next(!this.isPanelOpen);
  }

  closePanel(): void {
    this.panelOpenSubject.next(false);
  }

  add(productId: string, maximum: number): boolean {
    const current = this.items.find(item => item.productId === productId)?.quantity ?? 0;
    if (current >= maximum) return false;
    this.update(productId, current + 1);
    return true;
  }

  setQuantity(productId: string, quantity: number, maximum: number): void {
    if (!Number.isInteger(quantity) || quantity < 1 || maximum < 1) {
      this.remove(productId);
      return;
    }
    this.update(productId, Math.min(quantity, maximum));
  }

  remove(productId: string): void {
    this.publish(this.items.filter(item => item.productId !== productId));
  }

  reconcile(availableQuantities: Map<string, number>): void {
    const retained = this.items.flatMap(item => {
      const maximum = availableQuantities.get(item.productId);
      if (maximum == null || maximum < 1) return [];
      return [{ ...item, quantity: Math.min(item.quantity, maximum) }];
    });
    if (JSON.stringify(retained) !== JSON.stringify(this.items)) this.publish(retained);
  }

  clear(): void {
    this.publish([]);
  }

  private update(productId: string, quantity: number): void {
    const existing = this.items.some(item => item.productId === productId);
    const next = existing
      ? this.items.map(item => item.productId === productId ? { ...item, quantity } : item)
      : [...this.items, { productId, quantity }];
    this.publish(next);
  }

  private publish(items: CartItem[]): void {
    this.itemsSubject.next(items);
    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify(items));
      this.storageAvailable = true;
    } catch {
      this.storageAvailable = false;
    }
  }

  private readCart(): CartItem[] {
    try {
      const saved = sessionStorage.getItem(this.storageKey);
      if (!saved) return [];
      const value: unknown = JSON.parse(saved);
      if (!Array.isArray(value)) return [];
      return value.filter((item): item is CartItem =>
        typeof item?.productId === 'string'
        && Number.isInteger(item.quantity)
        && item.quantity > 0
        && item.quantity <= 100);
    } catch {
      this.storageAvailable = false;
      return [];
    }
  }
}
