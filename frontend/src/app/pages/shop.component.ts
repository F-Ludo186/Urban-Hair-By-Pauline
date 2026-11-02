import { AsyncPipe, CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { catchError, map, of, tap } from 'rxjs';
import { CartItem, CartService } from '../data/cart.service';
import { CatalogService, Product, ShopOptions } from '../data/catalog.service';
import { CheckoutService } from '../data/checkout.service';

interface CartLine extends CartItem {
  product: Product;
}

@Component({
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe, FormsModule],
  template: `
    <section class="page-hero"><p class="eyebrow">LA SÉLECTION DU SALON</p><h1>La boutique <em>beauté.</em></h1><p>Les essentiels que nous aimons et utilisons au salon, pour prolonger le soin à la maison.</p></section>
    @if (checkoutMessage) { <p class="shop-state admin-success" role="status">{{ checkoutMessage }}</p> }
    @if (catalog$ | async; as catalog) {
      @if (catalog.error) {
        <p class="shop-state admin-error" role="alert">{{ catalog.error }}</p>
      } @else if (catalog.products.length) {
        <div class="shop-product-controls section-wrap">
          <div class="shop-product-filters">
            <label>Tri
              <select [(ngModel)]="sortMode" [ngModelOptions]="{standalone:true}" aria-label="Trier les produits">
                <option value="default">Par défaut</option>
                <option value="price-asc">Prix croissant</option>
                <option value="price-desc">Prix décroissant</option>
                <option value="name">Nom A à Z</option>
              </select>
            </label>
            <label>Catégorie
              <select [(ngModel)]="selectedCategory" [ngModelOptions]="{standalone:true}" aria-label="Filtrer par catégorie">
                <option value="">Toutes</option>
                @for (category of categories; track category) { <option [value]="category">{{ category }}</option> }
              </select>
            </label>
          </div>
          <div class="shop-display-controls">
            <span>Affichage</span>
            <div role="group" aria-label="Mode d’affichage des produits">
              <button type="button" aria-label="Grandes cartes" title="Grandes cartes" [class.is-active]="displayMode === 'large'" [attr.aria-pressed]="displayMode === 'large'" (click)="displayMode = 'large'">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="1"></rect><rect x="6.5" y="5.5" width="11" height="8" rx=".5"></rect><path d="M7 16h10M7 18.5h7"></path></svg>
              </button>
              <button type="button" aria-label="Petites cartes" title="Petites cartes" [class.is-active]="displayMode === 'small'" [attr.aria-pressed]="displayMode === 'small'" (click)="displayMode = 'small'">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx=".7"></rect><rect x="13" y="3" width="8" height="8" rx=".7"></rect><rect x="3" y="13" width="8" height="8" rx=".7"></rect><rect x="13" y="13" width="8" height="8" rx=".7"></rect></svg>
              </button>
              <button type="button" aria-label="Affichage en ligne" title="Affichage en ligne" [class.is-active]="displayMode === 'list'" [attr.aria-pressed]="displayMode === 'list'" (click)="displayMode = 'list'">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="6" height="6" rx=".5"></rect><path d="M12 5h9M12 8h7"></path><rect x="3" y="14" width="6" height="6" rx=".5"></rect><path d="M12 15h9M12 18h7"></path></svg>
              </button>
            </div>
          </div>
        </div>
        <section class="product-grid section-wrap" [class.product-grid-small]="displayMode === 'small'" [class.product-grid-list]="displayMode === 'list'" aria-label="Produits de la boutique">
          @for (product of visibleProducts; track product.id) {
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
              <p class="product-description">{{ product.description }}</p>
              @if (product.stockQuantity === 0) {
                <span class="product-unavailable-note">Ce produit n’est pas disponible pour le moment.</span>
              } @else {
                <button class="shop-add-button" type="button" (click)="addToCart(product)">Ajouter au panier</button>
                <a class="text-link" [href]="contactLink(product)">Une question ? Nous contacter <span>↗</span></a>
              }
            </article>
          } @empty {
            <p class="gallery-empty">Aucun produit dans cette catégorie.</p>
          }
        </section>
      } @else {
        <p class="gallery-empty">La sélection du salon sera bientôt disponible.</p>
      }
    } @else {
      <p class="shop-state" role="status">Chargement de la boutique…</p>
    }

    @if (isCartOpen) {
    <button class="shop-cart-backdrop" type="button" aria-label="Fermer le panier" (click)="cart.closePanel()"></button>
    <section class="shop-cart" id="shop-cart-panel" aria-labelledby="cart-title">
      <div class="shop-cart-heading">
        <div><p class="eyebrow">VOTRE SÉLECTION</p><h2 id="cart-title">Votre panier <span>({{ cartCount }})</span></h2></div>
        @if (cartLines.length) { <button class="admin-secondary-button" type="button" (click)="clearCart()">Vider le panier</button> }
      </div>
      @if (cartError) { <p class="admin-error" role="alert">{{ cartError }}</p> }
      @if (cartLines.length) {
        <div class="shop-cart-lines">
          @for (line of cartLines; track line.productId) {
            <article class="shop-cart-line">
              <img [src]="line.product.imageUrl" [alt]="line.product.name" loading="lazy">
              <div class="shop-cart-line-info"><h3>{{ line.product.name }}</h3><span>{{ unitPrice(line.product) | currency:'EUR':'symbol':'1.2-2':'fr-FR' }}</span></div>
              <label>Quantité
                <input type="number" min="1" [max]="maximumQuantity(line.product)" [value]="line.quantity" (change)="changeQuantity(line.product, $event)">
              </label>
              <strong>{{ lineTotal(line) | currency:'EUR':'symbol':'1.2-2':'fr-FR' }}</strong>
              <button class="shop-cart-remove" type="button" (click)="removeFromCart(line.productId)" [attr.aria-label]="'Retirer ' + line.product.name">Retirer</button>
            </article>
          }
        </div>

        <form class="shop-checkout" #checkoutForm="ngForm" (ngSubmit)="checkout(checkoutForm)">
          <div class="shop-checkout-total"><span>Sous-total</span><strong>{{ cartSubtotal | currency:'EUR':'symbol':'1.2-2':'fr-FR' }}</strong></div>
          @if (options?.deliveryAvailable && fulfillment === 'DELIVERY') {
            <div class="shop-checkout-total"><span>Livraison · {{ options?.deliveryZone }}</span><strong>{{ options?.deliveryFee | currency:'EUR':'symbol':'1.2-2':'fr-FR' }}</strong></div>
          }
          <fieldset>
            <legend>Comment souhaitez-vous recevoir votre commande ?</legend>
            <label class="shop-checkout-choice"><input type="radio" name="fulfillment" [(ngModel)]="fulfillment" value="PICKUP"> Retrait gratuit au salon</label>
            @if (options?.deliveryAvailable) {
              <label class="shop-checkout-choice"><input type="radio" name="fulfillment" [(ngModel)]="fulfillment" value="DELIVERY"> Livraison · {{ options?.deliveryFee | currency:'EUR':'symbol':'1.2-2':'fr-FR' }}</label>
              <p class="shop-checkout-help">Zone de livraison : {{ options?.deliveryZone }}</p>
            } @else {
              <p class="shop-checkout-help">La livraison n’est pas encore configurée. Le retrait au salon reste disponible.</p>
            }
          </fieldset>

          @if (fulfillment === 'DELIVERY') {
            <div class="shop-checkout-grid">
              <label class="admin-field admin-field-wide">Adresse<input name="addressLine1" [(ngModel)]="customer.addressLine1" maxlength="200" required autocomplete="address-line1"></label>
              <label class="admin-field">Code postal<input name="postalCode" [(ngModel)]="customer.postalCode" maxlength="20" required autocomplete="postal-code"></label>
              <label class="admin-field">Ville<input name="city" [(ngModel)]="customer.city" maxlength="120" required autocomplete="address-level2"></label>
              <p class="shop-checkout-help admin-field-wide">Livraison dans la zone configurée : {{ options?.deliveryZone }}. Le code postal est vérifié par le serveur.</p>
            </div>
          } @else {
            @if (options?.pickupAddress) { <p class="shop-checkout-help"><strong>Adresse du salon :</strong> {{ options?.pickupAddress }} {{ options?.pickupInstructions }}</p> }
          }

          <div class="shop-checkout-grid">
            <label class="admin-field">Nom et prénom<input name="customerName" [(ngModel)]="customer.customerName" maxlength="160" required autocomplete="name"></label>
            <label class="admin-field">Téléphone<input name="customerPhone" [(ngModel)]="customer.customerPhone" maxlength="40" type="tel" required autocomplete="tel"></label>
            <label class="admin-field admin-field-wide">E-mail<input name="customerEmail" [(ngModel)]="customer.customerEmail" maxlength="254" type="email" required autocomplete="email"></label>
          </div>

          @if (!optionsLoaded) {
            <p class="shop-checkout-help" role="status">Vérification des options de commande…</p>
          } @else if (!options?.checkoutAvailable) {
            <p class="admin-error" role="status">Le paiement par carte n’est pas encore activé. Le salon doit terminer la configuration du paiement et des e-mails avant d’accepter les commandes en ligne.</p>
          }
          @if (checkoutError) { <p class="admin-error" role="alert">{{ checkoutError }}</p> }
          @if (!cart.canPersist) { <p class="shop-checkout-help" role="status">La mémorisation du panier est indisponible dans ce navigateur. Évitez de quitter cette page avant votre paiement.</p> }
          <div class="shop-checkout-actions">
            <strong>Total estimé : {{ cartTotal | currency:'EUR':'symbol':'1.2-2':'fr-FR' }}</strong>
            <button class="button button-dark" type="submit" [disabled]="checkoutLoading || !options?.checkoutAvailable">
              {{ checkoutLoading ? 'Redirection vers le paiement…' : 'Payer par carte en une fois' }}
            </button>
          </div>
          <p class="shop-checkout-help">Le paiement est traité de manière sécurisée par Stripe. Aucune donnée de carte n’est enregistrée par le salon.</p>
        </form>
      } @else {
        <p class="shop-cart-empty">Votre panier est vide. Ajoutez un produit pour préparer votre commande.</p>
      }
    </section>
    }
    <section class="shop-note"><p>Une question sur votre routine ?</p><a class="text-link" href="mailto:bonjour@urbanhair.fr">Pauline vous conseille au salon <span>↗</span></a></section>
  `
})
export class ShopComponent implements OnInit {
  private readonly catalog = inject(CatalogService);
  private readonly checkoutService = inject(CheckoutService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly cart = inject(CartService);

  products: Product[] = [];
  displayMode: 'large' | 'small' | 'list' = 'large';
  sortMode: 'default' | 'price-asc' | 'price-desc' | 'name' = 'default';
  selectedCategory = '';
  options: ShopOptions | null = null;
  optionsLoaded = false;
  fulfillment: 'DELIVERY' | 'PICKUP' = 'PICKUP';
  customer = { customerName: '', customerEmail: '', customerPhone: '', addressLine1: '', postalCode: '', city: '' };
  checkoutLoading = false;
  checkoutError = '';
  checkoutMessage = '';
  cartError = '';
  private checkoutFingerprint = '';
  private checkoutIdempotencyKey = '';

  get isCartOpen(): boolean {
    return this.cart.isPanelOpen;
  }

  get categories(): string[] {
    return [...new Set(this.products.map(product => product.category.trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, 'fr', { sensitivity: 'base' }));
  }

  get visibleProducts(): Product[] {
    const filtered = this.products.filter(product => !this.selectedCategory || product.category.trim() === this.selectedCategory);
    if (this.sortMode === 'price-asc') {
      return [...filtered].sort((left, right) => this.displayPrice(left) - this.displayPrice(right));
    }
    if (this.sortMode === 'price-desc') {
      return [...filtered].sort((left, right) => this.displayPrice(right) - this.displayPrice(left));
    }
    if (this.sortMode === 'name') {
      return [...filtered].sort((left, right) => left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' }));
    }
    return filtered;
  }

  private displayPrice(product: Product): number {
    return product.promotionPrice ?? product.price;
  }

  readonly catalog$ = this.catalog.getProducts().pipe(
    tap(products => {
      this.products = products;
      this.cart.reconcile(new Map(products.map(product => [product.id, this.maximumQuantity(product)])));
    }),
    map(products => ({ products, error: '' })),
    catchError(() => of({
      products: [] as Product[],
      error: 'Impossible de charger la boutique. Réessayez dans quelques instants.'
    }))
  );

  get cartLines(): CartLine[] {
    return this.cart.items.flatMap(item => {
      const product = this.products.find(candidate => candidate.id === item.productId);
      return product ? [{ ...item, product }] : [];
    });
  }

  get cartCount(): number {
    return this.cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  get cartSubtotal(): number {
    return this.cartLines.reduce((sum, line) => sum + this.unitPrice(line.product) * line.quantity, 0);
  }

  get cartTotal(): number {
    return this.cartSubtotal
      + (this.fulfillment === 'DELIVERY' && this.options?.deliveryAvailable ? this.options.deliveryFee ?? 0 : 0);
  }

  ngOnInit(): void {
    this.catalog.getShopOptions().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: options => {
        this.options = options;
        this.optionsLoaded = true;
      },
      error: () => {
        this.optionsLoaded = true;
        this.options = null;
      }
    });
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      if (params.get('checkout') === 'success') {
        this.cart.clear();
        this.checkoutMessage = 'Merci pour votre commande. Le paiement a été transmis et sa confirmation est en cours.';
      } else if (params.get('checkout') === 'cancel') {
        this.checkoutMessage = 'Le paiement a été interrompu. Votre panier est conservé.';
      }
    });
  }

  addToCart(product: Product): void {
    this.cartError = '';
    if (!this.cart.add(product.id, this.maximumQuantity(product))) {
      this.cartError = `La quantité disponible pour « ${product.name} » est déjà dans votre panier.`;
    }
  }

  changeQuantity(product: Product, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.cart.setQuantity(product.id, Number(input.value), this.maximumQuantity(product));
    input.value = String(this.cart.items.find(item => item.productId === product.id)?.quantity ?? '');
  }

  removeFromCart(productId: string): void {
    this.cart.remove(productId);
    this.cartError = '';
  }

  clearCart(): void {
    this.cart.clear();
    this.cartError = '';
  }

  unitPrice(product: Product): number {
    return product.promotionPrice ?? product.price;
  }

  lineTotal(line: CartLine): number {
    return this.unitPrice(line.product) * line.quantity;
  }

  maximumQuantity(product: Product): number {
    return Math.min(product.stockQuantity ?? 100, 100);
  }

  contactLink(product: Product): string {
    return `mailto:bonjour@urbanhair.fr?subject=${encodeURIComponent(`Demande produit : ${product.name}`)}`;
  }

  checkout(form: NgForm): void {
    if (this.checkoutLoading) return;
    this.checkoutError = '';
    if (!this.options?.checkoutAvailable) {
      this.checkoutError = 'Le paiement en ligne n’est pas encore configuré par le salon.';
      return;
    }
    if (!this.cartLines.length) {
      this.checkoutError = 'Votre panier est vide.';
      return;
    }
    if (form.invalid) {
      form.control.markAllAsTouched();
      this.checkoutError = 'Vérifiez les coordonnées et l’adresse de livraison saisies.';
      return;
    }

    this.checkoutLoading = true;
    const request = {
      items: this.cart.items.map(item => ({ productId: item.productId, quantity: item.quantity })),
      ...this.customer,
      fulfillment: this.fulfillment
    };
    const fingerprint = JSON.stringify(request);
    if (fingerprint !== this.checkoutFingerprint) {
      this.checkoutFingerprint = fingerprint;
      this.checkoutIdempotencyKey = crypto.randomUUID();
    }
    const payload = { ...request, idempotencyKey: this.checkoutIdempotencyKey };
    this.checkoutService.createCheckout(payload).subscribe({
      next: response => window.location.assign(response.checkoutUrl),
      error: (error: HttpErrorResponse) => {
        this.checkoutLoading = false;
        this.checkoutError = error.error?.message
          ?? (error.status === 0
            ? 'Le serveur ne répond pas. Vérifiez que le backend est démarré.'
            : 'Impossible de démarrer le paiement. Vérifiez votre panier puis réessayez.');
      }
    });
  }
}
