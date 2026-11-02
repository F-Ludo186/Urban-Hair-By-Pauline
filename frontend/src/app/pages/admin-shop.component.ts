import { CurrencyPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminService, ProductFormValue, ShopSettings } from '../data/admin.service';
import { Product } from '../data/catalog.service';

@Component({
  standalone: true,
  imports: [CurrencyPipe, FormsModule, RouterLink],
  template: `
    <div class="gallery-admin">
      <header class="gallery-admin-header">
        <a class="admin-brand" routerLink="/">URBAN HAIR<span>by Pauline</span></a>
        <div class="gallery-admin-heading"><p class="eyebrow">ESPACE PRIVÉ</p><h1>Votre boutique</h1></div>
        <div class="gallery-admin-actions"><a routerLink="/admin">Tableau de bord</a><a routerLink="/boutique" target="_blank" rel="noopener">Voir le site ↗</a><button type="button" (click)="logout()">Déconnexion</button></div>
      </header>

      <main class="shop-admin-main">
        @if (successMessage) { <p class="admin-success" role="status">{{ successMessage }}</p> }
        @if (errorMessage) { <p class="admin-error" role="alert">{{ errorMessage }}</p> }

        <div class="shop-admin-workspace">
          <aside class="shop-admin-manager" aria-label="Gestion de la boutique">
            <div class="panel-heading shop-manager-heading"><div><p class="eyebrow">PARAMÈTRES</p><h2>Gestion globale</h2></div></div>

            <details class="admin-editor shop-settings-editor">
              <summary class="shop-settings-summary">
                <div><p class="eyebrow">COMMANDES EN LIGNE</p><h2 id="shop-settings-title">Livraison, retrait et notifications</h2></div>
                <span class="shop-settings-expand">Afficher les paramètres</span>
                <span class="shop-settings-collapse">Masquer les paramètres</span>
              </summary>
              @if (settingsLoading) {
                <p class="admin-empty" role="status">Chargement des paramètres…</p>
              } @else {
                <div class="shop-checkout-status">
                  <p><strong>Paiement Stripe :</strong> {{ paymentConfigured ? 'clés configurées' : 'à configurer dans les variables du serveur' }}</p>
                  <p><strong>E-mail SMTP :</strong> {{ mailConfigured ? 'configuré' : 'à configurer dans les variables du serveur' }}</p>
                  <p>Les paiements restent désactivés tant que Stripe et l’envoi d’e-mails ne sont pas configurés.</p>
                </div>
                <form (ngSubmit)="saveSettings()" #settingsForm="ngForm">
                  <div class="admin-form-grid">
                    <label class="admin-field admin-field-wide">E-mail du salon pour les commandes<input name="notificationEmail" type="email" [(ngModel)]="settings.notificationEmail" maxlength="254" required></label>
                    <label class="admin-field">Forfait livraison TTC (€) <span class="admin-optional">Laisser vide pour désactiver la livraison</span><input name="deliveryFee" type="number" [(ngModel)]="settings.deliveryFee" min="0" max="999999.99" step="0.01"></label>
                    <label class="admin-field">Zone de livraison<input name="deliveryZone" [(ngModel)]="settings.deliveryZone" maxlength="120" required></label>
                    <label class="admin-field admin-field-wide">Préfixes des codes postaux autorisés <span class="admin-optional">Ex. 37 ou 37, 41 ; plages possibles : 01-19,20,21-95</span><input name="deliveryPostalPrefixes" [(ngModel)]="settings.deliveryPostalPrefixes" maxlength="120" required></label>
                    <label class="admin-field admin-field-wide">Adresse de retrait au salon<input name="pickupAddress" [(ngModel)]="settings.pickupAddress" maxlength="500" required></label>
                    <label class="admin-field admin-field-wide">Instructions de retrait <span class="admin-optional">Facultatif</span><textarea name="pickupInstructions" [(ngModel)]="settings.pickupInstructions" maxlength="1000" rows="2"></textarea></label>
                  </div>
                  @if (settingsError) { <p class="admin-error" role="alert">{{ settingsError }}</p> }
                  <div class="admin-form-actions"><button class="button button-dark" type="submit" [disabled]="settingsSaving || !settingsForm.valid">{{ settingsSaving ? 'Enregistrement…' : 'Enregistrer les paramètres' }}</button></div>
                </form>
              }
            </details>

            <section class="shop-manager-products" aria-labelledby="shop-products-title">
              <div class="shop-manager-products-heading">
                <div><p class="eyebrow">PRODUITS &amp; SOINS</p><h2 id="shop-products-title">Gestion des produits</h2></div>
                <button class="button button-dark" type="button" (click)="startNewProduct()" [disabled]="saving">＋ Ajouter un produit</button>
              </div>

              @if (editing) {
                <section class="admin-editor shop-product-editor" aria-labelledby="product-editor-title">
                  <div class="admin-editor-heading"><div><p class="eyebrow">{{ editingId ? 'MODIFICATION' : 'NOUVEL ARTICLE' }}</p><h2 id="product-editor-title">{{ editingId ? 'Modifier le produit' : 'Créer un produit' }}</h2></div><button class="admin-close" type="button" (click)="cancelEdit()" [disabled]="saving" aria-label="Fermer">×</button></div>
                  <form (ngSubmit)="saveProduct()" #productForm="ngForm">
                    <div class="admin-form-grid">
                      <label class="admin-field">Nom du produit<input name="name" [(ngModel)]="form.name" maxlength="120" required></label>
                      <label class="admin-field">Catégorie<input name="category" [(ngModel)]="form.category" maxlength="80" placeholder="Soin, coiffage…" required></label>
                      <label class="admin-field">Marque <span class="admin-optional">Facultatif</span><input name="brand" [(ngModel)]="form.brand" maxlength="120"></label>
                      <label class="admin-field">Format / contenance <span class="admin-optional">Facultatif</span><input name="productFormat" [(ngModel)]="form.productFormat" maxlength="120" placeholder="250 ml"></label>
                      <label class="admin-field">Référence / SKU <span class="admin-optional">Facultatif · unique</span><input name="sku" [(ngModel)]="form.sku" maxlength="80"></label>
                      <label class="admin-field">Prix de vente TTC (€)<input name="price" type="number" [(ngModel)]="form.price" min="0" max="99999999.99" step="0.01" required></label>
                      <label class="admin-field">Prix promotionnel TTC (€) <span class="admin-optional">Facultatif</span><input name="promotionPrice" type="number" [(ngModel)]="form.promotionPrice" min="0" max="99999999.99" step="0.01"></label>
                      <label class="admin-field">Quantité en stock <span class="admin-optional">Laisser vide si non suivie</span><input name="stockQuantity" type="number" [(ngModel)]="form.stockQuantity" min="0" step="1"></label>
                      <label class="admin-field admin-field-wide">Description<textarea name="description" [(ngModel)]="form.description" maxlength="2000" rows="4" placeholder="Bénéfices, conseils d’utilisation, composition…"></textarea></label>
                      <label class="admin-field admin-field-wide">Photo du produit <span class="admin-optional">JPG ou PNG · 10 Mo max.{{ editingId ? ' · laisser vide pour conserver la photo actuelle' : '' }}</span><input name="image" type="file" accept="image/jpeg,image/png" (change)="selectImage($event)" [required]="!editingId"><img [src]="imagePreviewUrl || (editingProduct?.imageUrl ?? '')" [hidden]="!imagePreviewUrl && !editingProduct?.imageUrl" class="shop-product-image-preview" alt="Aperçu de la photo produit"></label>
                      <label class="admin-publish-toggle"><input name="published" type="checkbox" [(ngModel)]="form.published"> Publier dans la boutique</label>
                      <label class="admin-publish-toggle"><input name="featured" type="checkbox" [(ngModel)]="form.featured"> Mettre en avant</label>
                    </div>
                    @if (imageError) { <p class="admin-error" role="alert">{{ imageError }}</p> }
                    <div class="admin-form-actions"><button class="admin-secondary-button" type="button" (click)="cancelEdit()" [disabled]="saving">Annuler</button><button class="button button-dark" type="submit" [disabled]="saving || !productForm.valid">{{ saving ? 'Enregistrement…' : 'Enregistrer le produit' }}</button></div>
                  </form>
                </section>
              }
            </section>
          </aside>

          <section class="admin-items shop-product-list" aria-labelledby="products-heading">
          <div class="admin-list-heading"><div><h2 id="products-heading">Catalogue <span>({{ products.length }})</span></h2><p>Montez ou descendez les produits pour modifier leur ordre d’affichage.</p></div></div>
          @if (loading) {
            <p class="admin-empty" role="status">Chargement du catalogue…</p>
          } @else if (loadError) {
            <div class="admin-error" role="alert">{{ loadError }} <button type="button" (click)="loadProducts()">Réessayer</button></div>
          } @else if (!products.length) {
            <div class="admin-empty"><h3>Votre catalogue est vide.</h3><p>Ajoutez votre premier produit pour le présenter sur la boutique.</p><button class="button button-dark" type="button" (click)="startNewProduct()">＋ Ajouter un produit</button></div>
          } @else {
            <div class="shop-product-grid">
              @for (product of products; track product.id; let i = $index) {
                <article class="shop-admin-product-card">
                  <img [src]="product.imageUrl" [alt]="product.name" loading="lazy">
                  <div class="shop-admin-product-body">
                    <div class="shop-admin-product-status"><span [class.is-published]="product.published">{{ product.published ? 'Publié' : 'Brouillon' }}</span>@if (product.featured) { <span class="is-featured">Mis en avant</span> }</div>
                    <h3>{{ product.name }}</h3>
                    <p class="shop-admin-product-meta">{{ product.brand ? product.brand + ' · ' : '' }}{{ product.category }}{{ product.productFormat ? ' · ' + product.productFormat : '' }}</p>
                    <div class="shop-admin-product-price">@if (product.promotionPrice !== null) { <del>{{ product.price | currency:'EUR':'symbol':'1.2-2':'fr-FR' }}</del> }<strong>{{ (product.promotionPrice ?? product.price) | currency:'EUR':'symbol':'1.2-2':'fr-FR' }}</strong></div>
                    @if (product.sku) { <p class="shop-admin-product-meta">Réf. {{ product.sku }}</p> }
                    <p class="shop-admin-product-meta">{{ product.stockQuantity === null ? 'Stock non suivi' : product.stockQuantity + ' en stock' }}</p>
                    <div class="shop-admin-product-actions"><button type="button" (click)="moveProduct(i, -1)" [disabled]="ordering || i === 0" [attr.aria-label]="'Monter ' + product.name">↑</button><button type="button" (click)="moveProduct(i, 1)" [disabled]="ordering || i === products.length - 1" [attr.aria-label]="'Descendre ' + product.name">↓</button><button type="button" (click)="editProduct(product)" [disabled]="saving">Modifier</button><button type="button" class="admin-delete" (click)="deleteProduct(product)" [disabled]="saving">Supprimer</button></div>
                  </div>
                </article>
              }
            </div>
          }
          </section>
        </div>
      </main>
    </div>
  `
})
export class AdminShopComponent implements OnInit, OnDestroy {
  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);

  products: Product[] = [];
  loading = true;
  loadError = '';
  errorMessage = '';
  successMessage = '';
  saving = false;
  ordering = false;
  editing = false;
  editingId: string | null = null;
  editingProduct: Product | null = null;
  selectedImage: File | null = null;
  imagePreviewUrl = '';
  imageError = '';
  settingsLoading = true;
  settingsSaving = false;
  settingsError = '';
  paymentConfigured = false;
  mailConfigured = false;
  settings: ShopSettings = {
    notificationEmail: '',
    deliveryFee: null,
    deliveryZone: '',
    deliveryPostalPrefixes: '',
    pickupAddress: '',
    pickupInstructions: ''
  };
  form = this.emptyForm();

  ngOnInit(): void {
    this.loadProducts();
    this.loadSettings();
  }

  ngOnDestroy(): void {
    this.releasePreviewUrl();
  }

  loadProducts(): void {
    this.loading = true;
    this.loadError = '';
    this.admin.getProducts().subscribe({
      next: products => {
        this.products = products;
        this.loading = false;
      },
      error: error => {
        this.loading = false;
        if (error.status === 401 || error.status === 403) {
          void this.router.navigateByUrl('/admin/login');
          return;
        }
        this.loadError = this.errorText(error);
      }
    });
  }

  loadSettings(): void {
    this.settingsLoading = true;
    this.admin.getShopSettings().subscribe({
      next: response => {
        this.settings = response.settings;
        this.paymentConfigured = response.paymentConfigured;
        this.mailConfigured = response.mailConfigured;
        this.settingsLoading = false;
      },
      error: error => {
        this.settingsLoading = false;
        if (error.status === 401 || error.status === 403) {
          void this.router.navigateByUrl('/admin/login');
          return;
        }
        this.settingsError = this.errorText(error);
      }
    });
  }

  saveSettings(): void {
    if (this.settingsSaving) return;
    this.settingsSaving = true;
    this.settingsError = '';
    this.admin.saveShopSettings(this.settings).pipe(finalize(() => this.settingsSaving = false)).subscribe({
      next: response => {
        this.settings = response.settings;
        this.paymentConfigured = response.paymentConfigured;
        this.mailConfigured = response.mailConfigured;
        this.successMessage = 'Les paramètres de commande ont été enregistrés.';
      },
      error: error => this.settingsError = this.errorText(error)
    });
  }

  startNewProduct(): void {
    this.resetEditor();
    this.editing = true;
  }

  editProduct(product: Product): void {
    this.resetEditor();
    this.editing = true;
    this.editingId = product.id;
    this.editingProduct = product;
    this.form = {
      name: product.name,
      category: product.category,
      description: product.description,
      price: product.price,
      promotionPrice: product.promotionPrice,
      sku: product.sku ?? '',
      brand: product.brand ?? '',
      productFormat: product.productFormat ?? '',
      stockQuantity: product.stockQuantity,
      published: product.published,
      featured: product.featured
    };
  }

  selectImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const image = input.files?.[0] ?? null;
    this.imageError = '';
    this.selectedImage = null;
    this.releasePreviewUrl();
    if (!image) return;

    if (image.size > 10 * 1024 * 1024) {
      this.imageError = 'La photo dépasse 10 Mo. Choisissez une image plus légère.';
    } else if (!['image/jpeg', 'image/png'].includes(image.type) && !/\.(jpe?g|png)$/i.test(image.name)) {
      this.imageError = 'Choisissez une image JPG ou PNG.';
    } else {
      this.selectedImage = image;
      this.imagePreviewUrl = URL.createObjectURL(image);
    }
    if (this.imageError) input.value = '';
  }

  saveProduct(): void {
    if (this.saving || this.imageError || (!this.editingId && !this.selectedImage)) {
      if (!this.editingId && !this.selectedImage && !this.imageError) this.imageError = 'Ajoutez une photo au produit.';
      return;
    }
    if (this.form.promotionPrice !== null && this.form.promotionPrice >= this.form.price) {
      this.errorMessage = 'Le prix promotionnel doit être inférieur au prix de vente.';
      return;
    }

    this.clearMessages();
    this.saving = true;
    const request = this.editingId
      ? this.admin.updateProduct(this.editingId, this.form, this.selectedImage ?? undefined)
      : this.admin.createProduct(this.form, this.selectedImage!);
    request.pipe(finalize(() => this.saving = false)).subscribe({
      next: product => {
        if (this.editingId) {
          this.products = this.products.map(current => current.id === product.id ? product : current);
          this.successMessage = `Le produit « ${product.name} » a été modifié.`;
        } else {
          this.products = [...this.products, product];
          this.successMessage = `Le produit « ${product.name} » a été ajouté.`;
        }
        this.cancelEdit();
      },
      error: error => this.errorMessage = this.errorText(error)
    });
  }

  moveProduct(index: number, offset: number): void {
    const destination = index + offset;
    if (destination < 0 || destination >= this.products.length || this.ordering) return;
    const reordered = [...this.products];
    [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
    this.ordering = true;
    this.clearMessages();
    this.admin.reorderProducts(reordered.map(product => product.id))
      .pipe(finalize(() => this.ordering = false))
      .subscribe({
        next: () => {
          this.products = reordered.map((product, sortOrder) => ({ ...product, sortOrder }));
          this.successMessage = 'Ordre du catalogue enregistré.';
        },
        error: error => this.errorMessage = this.errorText(error)
      });
  }

  deleteProduct(product: Product): void {
    if (!window.confirm(`Supprimer « ${product.name} » du catalogue ? Cette action est définitive.`) || this.saving) return;
    this.clearMessages();
    this.saving = true;
    this.admin.deleteProduct(product.id).pipe(finalize(() => this.saving = false)).subscribe({
      next: () => {
        this.products = this.products.filter(current => current.id !== product.id);
        if (this.editingId === product.id) this.cancelEdit();
        this.successMessage = `Le produit « ${product.name} » a été supprimé.`;
      },
      error: error => this.errorMessage = this.errorText(error)
    });
  }

  cancelEdit(): void {
    this.resetEditor();
  }

  logout(): void {
    this.admin.logout().subscribe({
      next: () => void this.router.navigateByUrl('/admin/login'),
      error: () => this.errorMessage = 'Déconnexion impossible. Fermez votre navigateur pour terminer la session.'
    });
  }

  private emptyForm(): ProductFormValue {
    return {
      name: '',
      category: '',
      description: '',
      price: 0,
      promotionPrice: null,
      sku: '',
      brand: '',
      productFormat: '',
      stockQuantity: null,
      published: true,
      featured: false
    };
  }

  private resetEditor(): void {
    this.releasePreviewUrl();
    this.editing = false;
    this.editingId = null;
    this.editingProduct = null;
    this.selectedImage = null;
    this.imageError = '';
    this.form = this.emptyForm();
  }

  private releasePreviewUrl(): void {
    if (this.imagePreviewUrl) URL.revokeObjectURL(this.imagePreviewUrl);
    this.imagePreviewUrl = '';
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private errorText(error: { status?: number; error?: { message?: string } }): string {
    if (error.status === 0) return 'Le serveur ne répond pas. Vérifiez que le backend est démarré.';
    if (error.status === 401 || error.status === 403) return 'Votre session a expiré. Reconnectez-vous.';
    if (error.status === 404) return 'L’API boutique n’est pas à jour. Redémarrez le backend puis rechargez cette page.';
    if (error.status === 409) return error.error?.message ?? 'Cette référence produit est déjà utilisée.';
    if (error.status === 413) return 'Cette photo est trop volumineuse. Choisissez une photo de 10 Mo maximum.';
    if (error.status === 400) return error.error?.message ?? 'Vérifiez les informations saisies.';
    return error.error?.message ?? 'Enregistrement impossible pour le moment. Réessayez.';
  }
}
