import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { AdminGalleryItem, AdminService, GalleryFormValue } from '../data/admin.service';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="admin-layout">
      <aside class="admin-sidebar">
        <a class="admin-brand" routerLink="/">URBAN HAIR<span>by Pauline</span></a>
        <p class="admin-sidebar-label">MON ESPACE</p>
        <nav class="admin-nav" aria-label="Administration">
          <a class="selected" href="#gallery">Mes réalisations</a>
          <button type="button" (click)="newItem()">Ajouter une photo</button>
          <a href="#gallery-help">Conseils photo</a>
        </nav>
        <div class="admin-sidebar-bottom">
          <a routerLink="/">Voir le site</a>
          <button type="button" (click)="logout()">Se déconnecter</button>
        </div>
      </aside>

      <main class="admin-main" id="gallery">
        <header class="admin-topbar">
          <div><p class="eyebrow">VOTRE ESPACE</p><h1>Ma galerie</h1></div>
        </header>
        <p class="admin-intro">Ajoutez vos réalisations et leurs légendes. Vous pouvez les garder en brouillon avant de les publier.</p>

        @if (successMessage) { <p class="admin-success" role="status">{{ successMessage }}</p> }
        @if (errorMessage) { <p class="admin-error" role="alert">{{ errorMessage }}</p> }

        @if (editorOpen) {
          <section class="admin-editor" aria-labelledby="editor-title">
            <div class="admin-editor-heading">
              <div><p class="eyebrow">VOTRE CONTENU</p><h2 id="editor-title">{{ editing ? 'Modifier la réalisation' : 'Ajouter une réalisation' }}</h2></div>
              <button class="admin-close" type="button" (click)="closeEditor()" aria-label="Fermer">×</button>
            </div>
            <form (ngSubmit)="saveItem()">
              <div class="admin-form-grid">
                <label class="admin-field admin-field-wide">Titre
                  <input name="title" [(ngModel)]="form.title" maxlength="120" required placeholder="Ex. Balayage lumineux">
                </label>
                <label class="admin-field">Rubrique
                  <select name="category" [(ngModel)]="form.category" required>
                    <option value="BALAYAGE">Balayage</option>
                    <option value="COLORATION">Coloration</option>
                    <option value="COUPE">Coupe</option>
                    <option value="COIFFAGE">Coiffage</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </label>
                <label class="admin-field">Lien vers Instagram <span class="admin-optional">(facultatif)</span>
                  <input name="instagramUrl" [(ngModel)]="form.instagramUrl" type="url" placeholder="https://www.instagram.com/p/...">
                </label>
                <label class="admin-field admin-field-wide">Texte / légende
                  <textarea name="caption" [(ngModel)]="form.caption" maxlength="2000" rows="4" placeholder="Racontez cette réalisation en quelques mots..."></textarea>
                </label>
                <label class="admin-field admin-field-wide">Photo <span class="admin-optional">{{ editing ? '(facultatif si vous gardez la photo actuelle)' : '(obligatoire)' }}</span>
                  <input name="image" type="file" accept="image/jpeg,image/png" (change)="selectImage($event)" [required]="!editing">
                  <span class="admin-help">JPG ou PNG, 10 Mo maximum. L’image est optimisée automatiquement.</span>
                </label>
                @if (imageErrorMessage) { <p class="admin-error admin-field-wide" role="alert">{{ imageErrorMessage }}</p> }
                @if (editing?.imageUrl && !selectedImage) {
                  <img class="admin-image-preview" [src]="editing?.imageUrl" alt="Photo actuellement utilisée">
                }
                @if (selectedImage) { <p class="admin-help admin-field-wide">Nouvelle photo sélectionnée : {{ selectedImage.name }}</p> }
                <label class="admin-publish-toggle">
                  <input name="published" type="checkbox" [(ngModel)]="form.published">
                  <span>Afficher cette réalisation sur le site</span>
                </label>
              </div>
              <div class="admin-form-actions">
                <button class="admin-secondary-button" type="button" (click)="closeEditor()">Annuler</button>
                <button class="button button-dark" type="submit" [disabled]="busy">{{ busy ? 'Enregistrement...' : 'Enregistrer' }}</button>
              </div>
            </form>
          </section>
        }

        <section class="admin-items" aria-label="Vos réalisations">
          <div class="admin-list-heading">
            <h2>Vos réalisations <span>({{ items.length }})</span></h2>
            <p>Seules les réalisations publiées sont visibles par vos visiteurs.</p>
          </div>
          @if (loading) {
            <p class="admin-empty">Chargement de votre galerie...</p>
          } @else if (items.length === 0) {
            <div class="admin-empty">
              <h3>Votre galerie est prête à accueillir vos photos</h3>
              <p>Ajoutez une réalisation pour la présenter sur votre site.</p>
              <button class="button button-dark" type="button" (click)="newItem()">Ajouter ma première photo</button>
            </div>
          } @else {
            <div class="admin-card-grid">
              @for (item of items; track item.id) {
                <article class="admin-card">
                  <img [src]="item.imageUrl" [alt]="item.title" loading="lazy">
                  <div class="admin-card-body">
                    <div class="admin-card-title"><h3>{{ item.title }}</h3><span [class.is-published]="item.published">{{ item.published ? 'Publié' : 'Brouillon' }}</span></div>
                    <p class="admin-card-category">{{ item.category }}</p>
                    <p class="admin-card-caption">{{ item.caption || 'Aucune légende pour le moment.' }}</p>
                    <div class="admin-card-actions">
                      <button type="button" (click)="editItem(item)">Modifier</button>
                      <button class="admin-delete" type="button" (click)="deleteItem(item)">Supprimer</button>
                    </div>
                  </div>
                </article>
              }
            </div>
          }
        </section>

        <aside id="gallery-help" class="admin-help-box">
          <h2>Un coup de main ?</h2>
          <p>Choisissez une photo nette, ajoutez un titre simple et racontez votre réalisation. Gardez-la en brouillon si vous souhaitez la publier plus tard.</p>
        </aside>
      </main>
    </div>
  `
})
export class AdminComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);

  items: AdminGalleryItem[] = [];
  editing: AdminGalleryItem | null = null;
  selectedImage: File | null = null;
  editorOpen = false;
  loading = true;
  busy = false;
  errorMessage = '';
  successMessage = '';
  imageErrorMessage = '';
  form: GalleryFormValue = this.emptyForm();

  ngOnInit(): void {
    this.loadItems();
  }

  newItem(): void {
    this.editing = null;
    this.selectedImage = null;
    this.form = this.emptyForm();
    this.editorOpen = true;
    this.clearMessages();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  editItem(item: AdminGalleryItem): void {
    this.editing = item;
    this.selectedImage = null;
    this.form = {
      title: item.title,
      caption: item.caption,
      category: item.category,
      instagramUrl: item.instagramUrl ?? '',
      published: item.published
    };
    this.editorOpen = true;
    this.clearMessages();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeEditor(): void {
    this.editorOpen = false;
    this.selectedImage = null;
  }

  selectImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const image = input.files?.[0] ?? null;
    this.imageErrorMessage = '';
    if (image && image.size > 10 * 1024 * 1024) {
      this.selectedImage = null;
      input.value = '';
      this.imageErrorMessage = 'Cette photo dépasse 10 Mo. Choisissez une photo plus légère.';
      return;
    }
    if (image && !['image/jpeg', 'image/png'].includes(image.type)) {
      this.selectedImage = null;
      input.value = '';
      this.imageErrorMessage = 'Choisissez une photo au format JPG ou PNG.';
      return;
    }
    this.selectedImage = image;
  }

  saveItem(): void {
    if (this.busy || this.imageErrorMessage || (!this.editing && !this.selectedImage)) return;
    this.busy = true;
    this.clearMessages();
    const request = this.editing
      ? this.admin.updateGalleryItem(this.editing.id, this.form, this.selectedImage ?? undefined)
      : this.admin.createGalleryItem(this.form, this.selectedImage!);
    request.pipe(
      timeout(120_000),
      finalize(() => this.busy = false)
    ).subscribe({
      next: () => {
        this.busy = false;
        this.successMessage = this.form.published ? 'Votre réalisation est enregistrée et publiée.' : 'Votre réalisation est enregistrée en brouillon.';
        this.closeEditor();
        this.loadItems();
      },
      error: (error: { error?: { message?: string }; status?: number; name?: string }) => {
        this.busy = false;
        this.errorMessage = this.getSaveErrorMessage(error);
      }
    });
  }

  deleteItem(item: AdminGalleryItem): void {
    if (!window.confirm(`Supprimer « ${item.title} » ? Cette action est définitive.`)) return;
    this.clearMessages();
    this.admin.deleteGalleryItem(item.id).subscribe({
      next: () => {
        this.items = this.items.filter((current) => current.id !== item.id);
        this.successMessage = 'La réalisation a été supprimée.';
      },
      error: () => this.errorMessage = 'Suppression impossible. Réessayez.'
    });
  }

  logout(): void {
    this.admin.logout().subscribe({
      next: () => this.router.navigateByUrl('/admin/login'),
      error: () => this.errorMessage = 'Déconnexion impossible. Fermez votre navigateur pour terminer la session.'
    });
  }

  private loadItems(): void {
    this.loading = true;
    this.admin.getGallery().subscribe({
      next: (items) => {
        this.items = items;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Impossible de charger la galerie. Rechargez la page ou reconnectez-vous.';
      }
    });
  }

  private emptyForm(): GalleryFormValue {
    return { title: '', caption: '', category: 'BALAYAGE', instagramUrl: '', published: true };
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private getSaveErrorMessage(error: { error?: { message?: string }; status?: number; name?: string }): string {
    if (error.name === 'TimeoutError') {
      return 'L’enregistrement prend trop de temps. Vérifiez votre connexion et réessayez.';
    }
    if (error.status === 0) {
      return 'Le serveur ne répond pas. Vérifiez que le backend est démarré, puis réessayez.';
    }
    if (error.status === 401 || error.status === 403) {
      return 'Votre session a expiré. Reconnectez-vous pour continuer.';
    }
    if (error.status === 413) {
      return 'Cette photo est trop volumineuse. Choisissez une photo de 10 Mo maximum.';
    }
    if (error.status === 400) {
      return error.error?.message ?? 'Certaines informations ou la photo ne sont pas valides. Vérifiez le formulaire.';
    }
    return error.error?.message ?? 'Enregistrement impossible pour le moment. Réessayez.';
  }
}
