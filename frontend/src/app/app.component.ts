import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CartItem, CartService } from './data/cart.service';

@Component({
  selector: 'uh-root',
  standalone: true,
  imports: [AsyncPipe, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    @if (!isAdminRoute()) {
      <div class="announcement">
        <span class="announcement-message">L’élégance au naturel · Prenez un moment pour vous</span>
        @if (isShopRoute()) {
          @if (cart.items$ | async; as cartItems) {
            <button class="shop-cart-toggle" type="button" (click)="cart.togglePanel()"
              [attr.aria-expanded]="cart.isPanelOpen" [attr.aria-controls]="cart.isPanelOpen ? 'shop-cart-panel' : null">
              Mon panier ({{ cartItemCount(cartItems) }} article{{ cartItemCount(cartItems) > 1 ? 's' : '' }})
            </button>
          }
        }
      </div>
      <header class="site-header">
        <a class="brand brand-logo" routerLink="/" aria-label="Urban Hair, accueil">
          <img src="/images/logos/logo.jpg" alt="Urban Hair by Pauline">
        </a>
        <nav aria-label="Navigation principale">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Accueil</a>
          <a routerLink="/boutique" routerLinkActive="active">Boutique</a>
          <a routerLink="/galerie" routerLinkActive="active">Galerie</a>
          <a routerLink="/contact" routerLinkActive="active">Contact</a>
        </nav>
        <div class="site-header-actions">
          <a class="header-cta" href="https://www.planity.com/urban-hair-by-pauline-37800-sainte-catherine-de-fierbois" target="_blank" >
            Prendre rendez-vous <span>↗</span>
          </a>
        </div>
      </header>
    }
    <main><router-outlet /></main>
    @if (!isAdminRoute()) {
      <footer class="site-footer">
        <a class="brand footer-brand" routerLink="/">URBAN HAIR<span>by Pauline</span></a>
        <p>Un lieu, une signature, votre beauté.</p>
        <div class="footer-links">
        <a routerLink="/boutique">Boutique</a>
        <a routerLink="/galerie">Galerie</a>
        <a routerLink="/contact">Contact</a>
        <a class="footer-admin-link" routerLink="/admin">Administration</a></div>
        <small>© 2026 Urban Hair by Pauline</small>
      </footer>
    }
  `
})
export class AppComponent {
  private readonly router = inject(Router);
  readonly cart = inject(CartService);

  isAdminRoute(): boolean {
    return this.router.url.startsWith('/admin');
  }

  isShopRoute(): boolean {
    return this.router.url.startsWith('/boutique');
  }

  cartItemCount(items: CartItem[]): number {
    return items.reduce((total, item) => total + item.quantity, 0);
  }
}
