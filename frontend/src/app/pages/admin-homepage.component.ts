import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminService } from '../data/admin.service';
import { HomeSection } from '../data/home-content.service';
import { HomeSectionsComponent } from './home-sections.component';

type HomeSectionId = HomeSection['id'];
type LayoutOption = { value: string; label: string };

@Component({
  standalone: true,
  imports: [FormsModule, HomeSectionsComponent, RouterLink],
  template: `
    <div class="gallery-admin">
      <header class="gallery-admin-header">
        <a class="admin-brand" routerLink="/">URBAN HAIR<span>by Pauline</span></a>
        <div class="gallery-admin-heading"><p class="eyebrow">ESPACE PRIVÉ</p><h1>Votre page d’accueil</h1></div>
        <div class="gallery-admin-actions"><a routerLink="/admin">Tableau de bord</a><a routerLink="/" target="_blank" rel="noopener">Voir le site ↗</a><button type="button" (click)="logout()">Déconnexion</button></div>
      </header>

      <main class="home-admin-main">
        @if (successMessage) { <p class="admin-success" role="status">{{ successMessage }}</p> }
        @if (errorMessage) { <p class="admin-error" role="alert">{{ errorMessage }}</p> }

        <div class="home-admin-workspace">
          <aside class="home-manager" aria-label="Gestion des sections de la page d’accueil">
            <div class="panel-heading"><div><p class="eyebrow">VOTRE CONTENU</p><h2>Modifier l’accueil</h2></div><span class="gallery-count">4 sections</span></div>
            @if (loading) {
              <p class="admin-empty" role="status">Chargement des sections…</p>
            } @else if (loadError) {
              <div class="admin-error" role="alert">{{ loadError }} <button type="button" (click)="loadSections()">Réessayer</button></div>
            } @else {
              <div class="home-section-order">
                <h3>Ordre d’affichage</h3>
                <ol>
                  @for (section of sections; track section.id; let i = $index) {
                    <li><span>{{ i + 1 }}. {{ sectionName(section.id) }}</span><div><button type="button" (click)="moveSection(i, -1)" [disabled]="ordering || i === 0" [attr.aria-label]="'Monter ' + sectionName(section.id)">↑</button><button type="button" (click)="moveSection(i, 1)" [disabled]="ordering || i === sections.length - 1" [attr.aria-label]="'Descendre ' + sectionName(section.id)">↓</button></div></li>
                  }
                </ol>
              </div>

              @for (section of sections; track section.id) {
                <section class="admin-editor home-section-editor">
                  <div class="admin-editor-heading"><div><p class="eyebrow">SECTION {{ section.sortOrder + 1 }}</p><h2>{{ sectionName(section.id) }}</h2></div></div>
                  <form (ngSubmit)="saveSection(section)" #sectionForm="ngForm">
                    @if (section.id !== 'quote') {
                      <label class="admin-field">Petit titre<input [name]="'eyebrow-' + section.id" [(ngModel)]="section.eyebrow" maxlength="120"></label>
                    }
                    @if (section.id !== 'quote') {
                      <label class="admin-field">Titre principal<input [name]="'title-' + section.id" [(ngModel)]="section.title" maxlength="240" required></label>
                    }
                    <label class="admin-field">{{ section.id === 'quote' ? 'Texte de la citation' : 'Texte de présentation' }}<textarea [name]="'body-' + section.id" [(ngModel)]="section.body" maxlength="2000" rows="4"></textarea></label>
                    @if (section.id === 'quote') {
                      <label class="admin-field">Signature<input [name]="'signature-' + section.id" [(ngModel)]="section.signature" maxlength="120"></label>
                    }
                    @if (section.id !== 'quote') {
                      <label class="admin-field">Disposition<select [name]="'layout-' + section.id" [(ngModel)]="section.layout">
                        @for (option of layoutOptions(section.id); track option.value) { <option [value]="option.value">{{ option.label }}</option> }
                      </select></label>
                      <label class="admin-field">Texte du lien<input [name]="'link-label-' + section.id" [(ngModel)]="section.linkLabel" maxlength="120"></label>
                      <label class="admin-field">Destination du lien <span class="admin-optional">Chemin interne (ex. /galerie) ou mailto:</span><input [name]="'link-url-' + section.id" [(ngModel)]="section.linkUrl" maxlength="500" placeholder="/galerie"></label>
                    } @else {
                      <label class="admin-field">Disposition<select [name]="'layout-' + section.id" [(ngModel)]="section.layout">
                        @for (option of layoutOptions(section.id); track option.value) { <option [value]="option.value">{{ option.label }}</option> }
                      </select></label>
                    }

                    <label class="admin-field">Photo de la section <span class="admin-optional">JPG ou PNG · 10 Mo max.{{ imageUrlFor(section) ? ' · remplace la photo actuelle' : '' }}</span>
                      <input [name]="'image-' + section.id" type="file" accept="image/jpeg,image/png" (change)="selectImage(section.id, $event)">
                      <img [src]="imageUrlFor(section) || ''" [hidden]="!imageUrlFor(section)" class="home-image-preview" alt="Aperçu de l’image de la section">
                    </label>
                    @if (section.imageUrl || imagePreviews[section.id]) {
                      <label class="admin-publish-toggle home-remove-image"><input [name]="'remove-image-' + section.id" type="checkbox" [(ngModel)]="removeImages[section.id]" [disabled]="!!imageFiles[section.id]"> Retirer cette image</label>
                    }
                    @if (imageErrors[section.id]) { <p class="admin-error" role="alert">{{ imageErrors[section.id] }}</p> }
                    <div class="admin-form-actions"><button class="button button-dark" type="submit" [disabled]="savingId === section.id || !sectionForm.valid">{{ savingId === section.id ? 'Enregistrement…' : 'Enregistrer la section' }}</button></div>
                  </form>
                </section>
              }
            }
          </aside>

          <main class="gallery-live-preview">
            <div class="preview-toolbar"><div><p class="eyebrow">APERÇU EN DIRECT</p><h2>Page d’accueil</h2></div><span class="preview-status"><i></i> Les changements s’affichent ici</span></div>
            <div class="preview-page home-preview-page">
              <div class="preview-site-header"><span>URBAN HAIR <em>by Pauline</em></span><nav><u>Accueil</u>&nbsp;&nbsp;&nbsp; Boutique&nbsp;&nbsp;&nbsp; Galerie</nav><small>Prendre rendez-vous ↗</small></div>
              <app-home-sections [sections]="previewSections"></app-home-sections>
              <footer class="preview-footer">URBAN HAIR <em>by Pauline</em></footer>
            </div>
          </main>
        </div>
      </main>
    </div>
  `
})
export class AdminHomepageComponent implements OnInit, OnDestroy {
  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);

  sections: HomeSection[] = [];
  imageFiles: Partial<Record<HomeSectionId, File>> = {};
  imagePreviews: Partial<Record<HomeSectionId, string>> = {};
  removeImages: Partial<Record<HomeSectionId, boolean>> = {};
  imageErrors: Partial<Record<HomeSectionId, string>> = {};
  loading = true;
  loadError = '';
  errorMessage = '';
  successMessage = '';
  savingId: HomeSectionId | null = null;
  ordering = false;

  get previewSections(): HomeSection[] {
    return this.sections.map(section => ({ ...section, imageUrl: this.imageUrlFor(section) }));
  }

  ngOnInit(): void {
    this.loadSections();
  }

  ngOnDestroy(): void {
    for (const previewUrl of Object.values(this.imagePreviews)) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    }
  }

  loadSections(): void {
    this.loading = true;
    this.loadError = '';
    this.admin.getHomeSections().subscribe({
      next: sections => {
        this.sections = sections.sort((first, second) => first.sortOrder - second.sortOrder);
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

  sectionName(id: HomeSectionId): string {
    return { hero: 'Bannière principale', intro: 'Présentation', feature: 'Le salon', quote: 'Citation' }[id];
  }

  layoutOptions(id: HomeSectionId): LayoutOption[] {
    switch (id) {
      case 'hero':
        return [{ value: 'hero', label: 'Image de fond · texte à gauche' }, { value: 'hero-centered', label: 'Image de fond · texte centré' }];
      case 'intro':
        return [{ value: 'text', label: 'Texte sur deux colonnes' }, { value: 'image-left', label: 'Image à gauche' }, { value: 'image-right', label: 'Image à droite' }];
      case 'feature':
        return [{ value: 'image-left', label: 'Image à gauche' }, { value: 'image-right', label: 'Image à droite' }, { value: 'text', label: 'Texte seul' }];
      case 'quote':
        return [{ value: 'centered', label: 'Citation centrée' }, { value: 'image-left', label: 'Image à gauche' }, { value: 'image-right', label: 'Image à droite' }];
    }
  }

  imageUrlFor(section: HomeSection): string | null {
    if (this.removeImages[section.id]) return null;
    return this.imagePreviews[section.id] ?? section.imageUrl;
  }

  selectImage(id: HomeSectionId, event: Event): void {
    const input = event.target as HTMLInputElement;
    const image = input.files?.[0] ?? null;
    this.imageErrors[id] = '';
    if (!image) return;
    if (image.size > 10 * 1024 * 1024) {
      this.imageErrors[id] = 'La photo dépasse 10 Mo. Choisissez une image plus légère.';
    } else if (!['image/jpeg', 'image/png'].includes(image.type) && !/\.(jpe?g|png)$/i.test(image.name)) {
      this.imageErrors[id] = 'Choisissez une image JPG ou PNG.';
    } else {
      this.releasePreview(id);
      this.imageFiles[id] = image;
      this.imagePreviews[id] = URL.createObjectURL(image);
      this.removeImages[id] = false;
    }
    if (this.imageErrors[id]) input.value = '';
  }

  saveSection(section: HomeSection): void {
    if (this.savingId || this.imageErrors[section.id]) return;
    if (section.linkLabel && !section.linkUrl) {
      this.errorMessage = `Indiquez une destination pour le lien de la section « ${this.sectionName(section.id)} ».`;
      return;
    }
    this.errorMessage = '';
    this.successMessage = '';
    this.savingId = section.id;
    this.admin.saveHomeSection(section, this.imageFiles[section.id], !!this.removeImages[section.id])
      .pipe(finalize(() => this.savingId = null))
      .subscribe({
        next: saved => {
          this.sections = this.sections.map(current => current.id === saved.id ? saved : current);
          this.releasePreview(section.id);
          delete this.imageFiles[section.id];
          delete this.removeImages[section.id];
          delete this.imageErrors[section.id];
          this.successMessage = `La section « ${this.sectionName(section.id)} » a été enregistrée.`;
        },
        error: error => this.errorMessage = this.errorText(error)
      });
  }

  moveSection(index: number, offset: number): void {
    const destination = index + offset;
    if (destination < 0 || destination >= this.sections.length || this.ordering) return;
    const reordered = [...this.sections];
    [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
    this.ordering = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.admin.reorderHomeSections(reordered.map(section => section.id))
      .pipe(finalize(() => this.ordering = false))
      .subscribe({
        next: () => {
          this.sections = reordered.map((section, sortOrder) => ({ ...section, sortOrder }));
          this.successMessage = 'Ordre des sections enregistré.';
        },
        error: error => this.errorMessage = this.errorText(error)
      });
  }

  logout(): void {
    this.admin.logout().subscribe({
      next: () => void this.router.navigateByUrl('/admin/login'),
      error: () => this.errorMessage = 'Déconnexion impossible. Fermez votre navigateur pour terminer la session.'
    });
  }

  private releasePreview(id: HomeSectionId): void {
    const previewUrl = this.imagePreviews[id];
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    delete this.imagePreviews[id];
  }

  private errorText(error: { status?: number; error?: { message?: string } }): string {
    if (error.status === 0) return 'Le serveur ne répond pas. Vérifiez que le backend est démarré.';
    if (error.status === 401 || error.status === 403) return 'Votre session a expiré. Reconnectez-vous.';
    if (error.status === 404) return 'L’API de la page d’accueil n’est pas à jour. Redémarrez le backend puis rechargez cette page.';
    if (error.status === 413) return 'Cette photo est trop volumineuse. Choisissez une photo de 10 Mo maximum.';
    if (error.status === 400) return error.error?.message ?? 'Vérifiez les informations saisies.';
    return error.error?.message ?? 'Enregistrement impossible pour le moment. Réessayez.';
  }
}
