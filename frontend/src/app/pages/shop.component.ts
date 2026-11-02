import { AsyncPipe, CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { CatalogService, Product } from '../data/catalog.service';

@Component({
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe],
  template: `
    <section class="page-hero"><p class="eyebrow">LA SÉLECTION DU SALON</p><h1>La boutique <em>beauté.</em></h1><p>Les essentiels que nous aimons et utilisons au salon, pour prolonger le soin à la maison.</p></section>
    @if (catalog$ | async; as catalog) {
      @if (catalog.error) {
        <p class="shop-state admin-error" role="alert">{{ catalog.error }}</p>
      } @else if (catalog.products.length) {
        <section class="product-grid section-wrap" aria-label="Produits de la boutique">
          @for (product of catalog.products; track product.id) {
            <article class="product-card">
              <div class="product-photo">
                <img [src]="product.imageUrl" [alt]="product.name" loading="lazy">
                @if (product.featured) { <span class="product-tag">COUP DE CŒUR</span> }
                @if (product.stockQuantity === 0) { <span class="product-stock-out">Indisponible</span> }
              </div>
              <div class="product-info">
                <div>
                  @if (product.brand) { <p class="product-brand">{{ product.brand }}</p> }
                  <h2>{{ product.name }}</h2>
                  <p>{{ product.category }}{{ product.productFormat ? ' · ' + product.productFormat : '' }}</p>
                </div>
                <div class="product-prices">
                  @if (product.promotionPrice !== null) { <del>{{ product.price | currency:'EUR':'symbol':'1.2-2':'fr-FR' }}</del> }
                  <span [class.product-promo-price]="product.promotionPrice !== null">{{ (product.promotionPrice ?? product.price) | currency:'EUR':'symbol':'1.2-2':'fr-FR' }}</span>
                </div>
              </div>
              @if (product.description) { <p class="product-description">{{ product.description }}</p> }
              @if (product.stockQuantity === 0) {
                <span class="product-unavailable-note">Ce produit n’est pas disponible pour le moment.</span>
              } @else {
                <a class="text-link" [href]="contactLink(product)">Nous contacter <span>↗</span></a>
              }
            </article>
          }
        </section>
      } @else {
        <p class="gallery-empty">La sélection du salon sera bientôt disponible.</p>
      }
    } @else {
      <p class="shop-state" role="status">Chargement de la boutique…</p>
    }
    <section class="shop-note"><p>Une question sur votre routine ?</p><a class="text-link" href="mailto:bonjour@urbanhair.fr">Pauline vous conseille au salon <span>↗</span></a></section>
  `
})
export class ShopComponent {
  private readonly catalog = inject(CatalogService);

  catalog$ = this.catalog.getProducts().pipe(
    map(products => ({ products, error: '' })),
    catchError(() => of({
      products: [] as Product[],
      error: 'Impossible de charger la boutique. Réessayez dans quelques instants.'
    }))
  );

  contactLink(product: Product): string {
    return `mailto:bonjour@urbanhair.fr?subject=${encodeURIComponent(`Demande produit : ${product.name}`)}`;
  }
}
