import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { CatalogService } from '../data/catalog.service';

@Component({
  standalone: true,
  imports: [AsyncPipe],
  template: `
    <section class="page-hero"><p class="eyebrow">LA SÉLECTION DU SALON</p><h1>La boutique <em>beauté.</em></h1><p>Les essentiels que nous aimons et utilisons au salon, pour prolonger le soin à la maison.</p></section>
    <section class="product-grid section-wrap" aria-label="Produits de la boutique">
      @for (product of products$ | async; track product.id) {
        <article class="product-card"><div class="product-photo"><img [src]="product.imageUrl" [alt]="product.name" loading="lazy"><span class="product-tag">SÉLECTION SALON</span></div><div class="product-info"><div><h2>{{ product.name }}</h2><p>{{ product.category }}</p></div><span>{{ product.price }} €</span></div><a class="text-link" href="mailto:bonjour@urbanhair.fr?subject=Demande%20produit">Nous contacter <span>↗</span></a></article>
      }
    </section>
    <section class="shop-note"><p>Une question sur votre routine ?</p><a class="text-link" href="mailto:bonjour@urbanhair.fr">Pauline vous conseille au salon <span>↗</span></a></section>
  `
})
export class ShopComponent {
  products$ = inject(CatalogService).getProducts();
}
