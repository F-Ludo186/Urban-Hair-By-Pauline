import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { AdminGalleryGroup, AdminGalleryItem, AdminService, GalleryFormValue } from '../data/admin.service';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="gallery-admin">
      <header class="gallery-admin-header">
        <a class="admin-brand" routerLink="/">URBAN HAIR<span>by Pauline</span></a>
        <div class="gallery-admin-heading"><p class="eyebrow">ESPACE PRIVÉ</p><h1>Votre galerie</h1></div>
        <div class="gallery-admin-actions"><a routerLink="/galerie" target="_blank" rel="noopener">Voir le site ↗</a><button type="button" (click)="logout()">Déconnexion</button></div>
      </header>
      @if (successMessage) { <p class="admin-success gallery-admin-message" role="status">{{ successMessage }}</p> }
      @if (errorMessage) { <p class="admin-error gallery-admin-message" role="alert">{{ errorMessage }}</p> }

      <div class="gallery-workspace">
        <aside class="gallery-manager" aria-label="Gestion des photos">
          <div class="panel-heading"><div><p class="eyebrow">VOTRE CONTENU</p><h2>{{ editingId ? 'Modifier une photo' : 'Ajouter des photos' }}</h2></div><span class="gallery-count">{{ items.length }} photo{{ items.length > 1 ? 's' : '' }}</span></div>

          <label class="upload-zone" [class.upload-zone-active]="isDraggingFile" (dragover)="onFileDragOver($event)" (dragleave)="onFileDragLeave($event)" (drop)="onFileDrop($event)">
            <input type="file" accept="image/jpeg,image/png" multiple (change)="selectImages($event)" [disabled]="busy" aria-label="Choisir une ou plusieurs photos">
            <span class="upload-icon">＋</span><strong>Déposez vos photos ici</strong><span>ou cliquez pour parcourir · JPG ou PNG · 10 Mo max.</span>
          </label>
          @if (imageErrorMessage) { <p class="admin-error" role="alert">{{ imageErrorMessage }}</p> }
          @if (pendingFiles.length) {
            <div class="pending-files">
              <strong>{{ pendingFiles.length }} photo{{ pendingFiles.length > 1 ? 's' : '' }} prête{{ pendingFiles.length > 1 ? 's' : '' }}</strong>
              <div class="pending-list">@for (file of pendingFiles; track file.name + file.lastModified; let i = $index) {<span>{{ file.name }} <button type="button" (click)="removePending(i)" [disabled]="busy" [attr.aria-label]="'Retirer ' + file.name">×</button></span>}</div>
              <label class="admin-field pending-group-field">Groupe<select name="pendingGroupId" [(ngModel)]="pendingGroupId" (ngModelChange)="onPendingGroupChange($event)" [disabled]="busy"><option [ngValue]="null">Sans groupe</option><option value="__new__">Créer un nouveau groupe</option>@for (group of galleryGroups; track group.id) {<option [ngValue]="group.id">{{ group.title }}</option>}</select></label>
              @if (pendingGroupId === '__new__') { <label class="admin-field pending-group-field">Titre du groupe<input name="pendingGroupTitle" [(ngModel)]="pendingGroupTitle" maxlength="120" placeholder="Ex. Balayage miel"></label> }
              @if (uploadProgress) { <p class="upload-progress" role="status">{{ uploadProgress }}</p> }
              <button class="button button-dark full-button" type="button" (click)="startPendingUpload()" [disabled]="busy">{{ busy ? 'Ajout en cours…' : 'Ajouter à la galerie' }}</button>
            </div>
          }

          @if (editingId) {
            <form class="photo-editor" (ngSubmit)="saveItem()">
              <div class="photo-editor-title"><h3>Informations de la photo</h3><button type="button" class="icon-button" (click)="stopEditing()" aria-label="Fermer l’édition">×</button></div>
              <label class="admin-field">Titre<input name="title" [(ngModel)]="form.title" maxlength="120" required></label>
              <label class="admin-field">Rubrique<select name="category" [(ngModel)]="form.category"><option value="BALAYAGE">Balayage</option><option value="COLORATION">Coloration</option><option value="COUPE">Coupe</option><option value="COIFFAGE">Coiffage</option><option value="AUTRE">Autre</option></select></label>
              <label class="admin-field">Groupe<select name="groupId" [(ngModel)]="form.groupId"><option [ngValue]="null">Sans groupe</option>@for (group of galleryGroups; track group.id) {<option [ngValue]="group.id">{{ group.title }} ({{ group.itemCount }})</option>}</select></label>
              <label class="admin-field">Légende<textarea name="caption" [(ngModel)]="form.caption" maxlength="2000" rows="3" placeholder="Quelques mots sur cette réalisation..."></textarea></label>
              <label class="admin-field">Lien Instagram <span class="admin-optional">(facultatif)</span><input name="instagramUrl" [(ngModel)]="form.instagramUrl" type="url" placeholder="https://www.instagram.com/..."></label>
              <label class="admin-publish-toggle"><input name="published" type="checkbox" [(ngModel)]="form.published"><span>Afficher sur le site</span></label>
              <label class="replace-photo">Remplacer la photo<input type="file" accept="image/jpeg,image/png" (change)="selectReplacement($event)"></label>
              @if (replacementFile) { <p class="admin-help">Nouvelle image : {{ replacementFile.name }}</p> }
              <div class="editor-buttons"><button class="admin-secondary-button" type="button" (click)="stopEditing()">Annuler</button><button class="button button-dark" type="submit" [disabled]="busy">{{ busy ? 'Enregistrement…' : 'Enregistrer' }}</button></div>
            </form>
          }

          <div class="thumbnail-heading"><h3>Vos photos</h3><span>Glissez pour réordonner</span></div>
          @if (selectedItemIds.size) {
            <div class="selected-group-tools">
              <p>{{ selectedItemIds.size }} photo{{ selectedItemIds.size > 1 ? 's' : '' }} sélectionnée{{ selectedItemIds.size > 1 ? 's' : '' }}</p>
              <label class="admin-field">Titre du nouveau groupe<input name="selectedGroupTitle" [(ngModel)]="selectedGroupTitle" maxlength="120" placeholder="Ex. Avant / après"></label>
              <button class="button button-dark full-button" type="button" (click)="createGroupForSelection()" [disabled]="busy">Créer le groupe et y ajouter la sélection</button>
            </div>
          }
          @if (galleryGroups.length) {
            <div class="gallery-group-list"><h4>Groupes existants</h4>@for (group of galleryGroups; track group.id) {<div><span><strong>{{ group.title }}</strong><small>{{ group.itemCount }} photo{{ group.itemCount > 1 ? 's' : '' }}</small></span><button type="button" (click)="renameGroup(group)" [disabled]="busy" [attr.aria-label]="'Renommer le groupe ' + group.title">Renommer</button><button type="button" class="delete-thumb" (click)="deleteGroup(group)" [disabled]="busy" [attr.aria-label]="'Supprimer le groupe ' + group.title">×</button></div>}</div>
          }
          @if (loading) { <p class="admin-empty">Chargement des photos…</p> }
          @else if (!items.length) { <p class="thumbnail-empty">Votre galerie est vide. Ajoutez une première photo ci-dessus.</p> }
          @else {
            <ol class="thumbnail-list" (dragover)="onThumbDragOver($event)" (drop)="dropThumbnail($event)">
              @for (item of items; track item.id; let i = $index) {
                <li [class.thumbnail-selected]="editingId === item.id" [class.thumbnail-drop-target]="dropTargetIndex === i" draggable="true" (dragstart)="startThumbnailDrag($event, i)" (dragenter)="setDropTarget(i)" (dragend)="endThumbnailDrag()">
                  <label class="thumbnail-check"><input type="checkbox" [checked]="selectedItemIds.has(item.id)" (change)="toggleItemSelection(item.id, $event)" [attr.aria-label]="'Sélectionner ' + item.title"></label><button type="button" class="thumbnail-select" (click)="editItem(item)" [attr.aria-label]="'Modifier ' + item.title"><span class="drag-handle" aria-hidden="true">⠿</span><img [src]="item.imageUrl" [alt]="''" loading="lazy"><span class="thumbnail-details"><strong>{{ item.title }}</strong><small>{{ item.groupTitle || (item.published ? 'Publié' : 'Brouillon') }}</small></span></button>
                  <div class="thumbnail-actions"><button type="button" (click)="moveItem(i, -1)" [disabled]="i === 0 || ordering" [attr.aria-label]="'Monter ' + item.title">↑</button><button type="button" (click)="moveItem(i, 1)" [disabled]="i === items.length - 1 || ordering" [attr.aria-label]="'Descendre ' + item.title">↓</button><button type="button" class="delete-thumb" (click)="deleteItem(item)" [attr.aria-label]="'Supprimer ' + item.title">×</button></div>
                </li>
              }
            </ol>
          }
        </aside>

        <main class="gallery-live-preview">
          <div class="preview-toolbar"><div><p class="eyebrow">APERÇU EN DIRECT</p><h2>Page galerie</h2></div><span class="preview-status"><i></i> Les changements s’affichent ici</span></div>
          <div class="preview-page">
            <div class="preview-site-header"><span>URBAN HAIR <em>by Pauline</em></span><nav>Accueil&nbsp;&nbsp;&nbsp; Boutique&nbsp;&nbsp;&nbsp; <u>Galerie</u></nav><small>Prendre rendez-vous ↗</small></div>
            <section class="preview-hero"><p class="eyebrow">COUPES · COULEURS · INSPIRATION</p><h2>Le geste <em>juste.</em></h2><p>Quelques instants et transformations capturés au salon.</p></section>
            @if (loading) { <p class="preview-empty">Chargement de la galerie…</p> }
            @else {
              @for (group of previewGroups; track group.id) {
                @if (group.title) { <h3 class="preview-group-title">{{ group.title }}</h3> }
                <section class="preview-gallery" aria-label="{{ group.title || 'Autres réalisations' }}">
                  @for (item of group.items; track item.id) {
                    <figure [class.preview-editing]="editingId === item.id" (click)="editItem(item)">
                      <img [src]="item.imageUrl" [alt]="item.title"><figcaption><div><span>{{ displayTitle(item) }}</span>@if (displayCaption(item)) { <p>{{ displayCaption(item) }}</p> }</div><small>{{ displayCategory(item) }}</small></figcaption>
                      @if (editingId === item.id) { <span class="preview-edit-badge">Modification en cours</span> }
                    </figure>
                  }
                </section>
              } @empty { <p class="preview-empty">Les prochaines réalisations arrivent bientôt.</p> }
            }
            <section class="preview-cta"><p>Votre prochaine inspiration commence ici.</p><span>PARLONS DE VOS ENVIES ↗</span></section>
            <footer class="preview-footer">URBAN HAIR <em>by Pauline</em></footer>
          </div>
        </main>
      </div>
    </div>
  `
})
export class AdminComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);
  items: AdminGalleryItem[] = [];
  galleryGroups: AdminGalleryGroup[] = [];
  pendingFiles: File[] = [];
  pendingGroupId: string | null = null;
  pendingGroupTitle = '';
  pendingGroupItemIds: string[] = [];
  selectedItemIds = new Set<string>();
  selectedGroupTitle = '';
  replacementFile: File | null = null;
  editingId: string | null = null;
  draggedIndex: number | null = null;
  dropTargetIndex: number | null = null;
  form: GalleryFormValue = this.emptyForm();
  loading = true;
  busy = false;
  ordering = false;
  isDraggingFile = false;
  errorMessage = '';
  successMessage = '';
  imageErrorMessage = '';
  uploadProgress = '';

  get previewGroups(): { id: string; title: string; items: AdminGalleryItem[] }[] {
    const groups = new Map<string, { id: string; title: string; items: AdminGalleryItem[] }>();
    for (const item of this.items.filter(current => current.published)) {
      const id = item.groupId ?? 'ungrouped';
      let group = groups.get(id);
      if (!group) {
        group = { id, title: item.groupTitle ?? '', items: [] };
        groups.set(id, group);
      }
      group.items.push(item);
    }
    return [...groups.values()];
  }

  ngOnInit(): void { this.loadItems(); this.loadGroups(); }

  selectImages(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  selectReplacement(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.imageErrorMessage = '';
    if (file && this.validateFile(file)) this.replacementFile = file;
    else if (file) input.value = '';
  }

  onFileDragOver(event: DragEvent): void { event.preventDefault(); this.isDraggingFile = true; }
  onFileDragLeave(event: DragEvent): void { if (!event.currentTarget || ! (event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) this.isDraggingFile = false; }
  onFileDrop(event: DragEvent): void { event.preventDefault(); this.isDraggingFile = false; this.addFiles(Array.from(event.dataTransfer?.files ?? [])); }

  editItem(item: AdminGalleryItem): void {
    this.editingId = item.id;
    this.replacementFile = null;
    this.imageErrorMessage = '';
    this.form = { title: item.title, caption: item.caption, category: item.category, instagramUrl: item.instagramUrl ?? '', published: item.published, groupId: item.groupId };
  }

  stopEditing(): void { this.editingId = null; this.replacementFile = null; this.imageErrorMessage = ''; }

  saveItem(): void {
    if (this.busy || !this.editingId || this.imageErrorMessage) return;
    const id = this.editingId;
    this.busy = true;
    this.clearMessages();
    this.admin.updateGalleryItem(id, this.form, this.replacementFile ?? undefined).pipe(timeout(120_000), finalize(() => this.busy = false)).subscribe({
      next: updated => {
        this.items = this.items.map(item => item.id === id ? updated : item);
        this.loadGroups();
        this.successMessage = 'Modifications enregistrées.';
        this.stopEditing();
      },
      error: error => this.errorMessage = this.getSaveErrorMessage(error)
    });
  }

  startPendingUpload(): void {
    if (!this.pendingFiles.length || this.busy) return;
    const files = [...this.pendingFiles];
    this.clearMessages();
    if (this.pendingGroupId === '__new__') {
      const title = this.pendingGroupTitle.trim();
      if (!title) { this.errorMessage = 'Saisissez un titre pour le nouveau groupe.'; return; }
      this.busy = true;
      this.admin.createGalleryGroup(title).pipe(timeout(20_000)).subscribe({
        next: group => {
          this.pendingGroupId = group.id;
          this.galleryGroups = [...this.galleryGroups, group];
          this.uploadProgress = `Groupe « ${group.title} » créé. Préparation de ${files.length} photo${files.length > 1 ? 's' : ''}…`;
          this.assignPendingItemsThenUpload(group.id, files);
        },
        error: error => { this.busy = false; this.errorMessage = this.getSaveErrorMessage(error); }
      });
      return;
    }
    this.busy = true;
    this.uploadProgress = `Préparation de ${files.length} photo${files.length > 1 ? 's' : ''}…`;
    if (this.pendingGroupId) this.assignPendingItemsThenUpload(this.pendingGroupId, files);
    else this.uploadNext(files, 0);
  }

  private assignPendingItemsThenUpload(groupId: string, files: File[]): void {
    const ids = [...this.pendingGroupItemIds];
    if (!ids.length) { this.uploadNext(files, 0); return; }
    this.admin.assignGalleryItemsToGroup(groupId, ids).pipe(timeout(20_000)).subscribe({
      next: () => {
        const group = this.galleryGroups.find(current => current.id === groupId);
        const groupTitle = group?.title ?? this.pendingGroupTitle;
        this.items = this.items.map(item => ids.includes(item.id) ? { ...item, groupId, groupTitle } : item);
        this.galleryGroups = this.galleryGroups.map(current => current.id === groupId ? { ...current, itemCount: current.itemCount + ids.length } : current);
        this.pendingGroupItemIds = [];
        this.uploadNext(files, 0);
      },
      error: error => { this.busy = false; this.uploadProgress = ''; this.errorMessage = this.getSaveErrorMessage(error); }
    });
  }

  private uploadNext(files: File[], index: number): void {
    if (index >= files.length) {
      this.busy = false;
      this.uploadProgress = '';
      this.pendingFiles = [];
      this.pendingGroupId = null;
      this.pendingGroupTitle = '';
      this.pendingGroupItemIds = [];
      this.successMessage = `${files.length} photo${files.length > 1 ? 's ajoutées' : ' ajoutée'} à la galerie.`;
      this.loadGroups();
      return;
    }
    const file = files[index];
    this.uploadProgress = `Ajout de la photo ${index + 1} sur ${files.length} : ${file.name}`;
    const title = this.titleFromFile(file.name);
    const value = { ...this.emptyForm(), title, groupId: this.pendingGroupId === '__new__' ? null : this.pendingGroupId };
    this.admin.createGalleryItem(value, file).pipe(timeout(120_000)).subscribe({
      next: created => {
        this.items = [...this.items, created];
        if (created.groupId) this.galleryGroups = this.galleryGroups.map(group => group.id === created.groupId ? { ...group, itemCount: group.itemCount + 1 } : group);
        this.uploadNext(files, index + 1);
      },
      error: error => { this.busy = false; this.uploadProgress = ''; this.pendingFiles = files.slice(index); this.errorMessage = `${file.name} : ${this.getSaveErrorMessage(error)} Les photos déjà ajoutées sont conservées.`; }
    });
  }

  removePending(index: number): void {
    this.pendingFiles = this.pendingFiles.filter((_, i) => i !== index);
    if (!this.pendingFiles.length) { this.pendingGroupId = null; this.pendingGroupTitle = ''; this.pendingGroupItemIds = []; }
  }

  onPendingGroupChange(groupId: string | null): void {
    if (groupId !== '__new__') this.pendingGroupItemIds = [];
  }

  moveItem(index: number, offset: number): void {
    const destination = index + offset;
    if (destination < 0 || destination >= this.items.length || this.ordering) return;
    const reordered = [...this.items];
    [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
    this.persistOrder(reordered);
  }

  startThumbnailDrag(event: DragEvent, index: number): void {
    this.draggedIndex = index;
    if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(index)); }
  }
  onThumbDragOver(event: DragEvent): void { if (this.draggedIndex !== null) event.preventDefault(); }
  setDropTarget(index: number): void { this.dropTargetIndex = index; }
  dropThumbnail(event: DragEvent): void {
    event.preventDefault();
    const from = this.draggedIndex ?? Number(event.dataTransfer?.getData('text/plain'));
    const target = this.dropTargetIndex;
    if (!Number.isInteger(from) || from < 0 || from >= this.items.length || target === null || from === target) { this.endThumbnailDrag(); return; }
    const reordered = [...this.items];
    const [item] = reordered.splice(from, 1);
    reordered.splice(target, 0, item);
    this.persistOrder(reordered);
    this.endThumbnailDrag();
  }
  endThumbnailDrag(): void { this.draggedIndex = null; this.dropTargetIndex = null; }

  deleteItem(item: AdminGalleryItem): void {
    if (!window.confirm(`Supprimer « ${item.title} » ? Cette action est définitive.`)) return;
    this.clearMessages();
    this.admin.deleteGalleryItem(item.id).subscribe({
      next: () => { this.items = this.items.filter(current => current.id !== item.id); if (this.editingId === item.id) this.stopEditing(); this.loadGroups(); this.successMessage = 'La photo a été supprimée.'; },
      error: () => this.errorMessage = 'Suppression impossible. Réessayez.'
    });
  }

  displayTitle(item: AdminGalleryItem): string { return this.editingId === item.id ? (this.form.title || 'Sans titre') : item.title; }
  displayCaption(item: AdminGalleryItem): string { return this.editingId === item.id ? this.form.caption : item.caption; }
  displayCategory(item: AdminGalleryItem): string { return this.editingId === item.id ? this.form.category : item.category; }

  toggleItemSelection(id: string, event: Event): void {
    const selected = new Set(this.selectedItemIds);
    if ((event.target as HTMLInputElement).checked) selected.add(id); else selected.delete(id);
    this.selectedItemIds = selected;
  }

  createGroupForSelection(): void {
    const title = this.selectedGroupTitle.trim();
    const ids = [...this.selectedItemIds];
    if (!title || !ids.length || this.busy) return;
    this.busy = true;
    this.clearMessages();
    this.admin.createGalleryGroup(title).pipe(timeout(20_000)).subscribe({
      next: group => this.admin.assignGalleryItemsToGroup(group.id, ids).pipe(finalize(() => this.busy = false)).subscribe({
        next: () => {
          this.items = this.items.map(item => ids.includes(item.id) ? { ...item, groupId: group.id, groupTitle: group.title } : item);
          this.selectedItemIds = new Set();
          this.selectedGroupTitle = '';
          this.successMessage = `Le groupe « ${group.title} » a été créé.`;
          this.loadGroups();
        },
        error: error => {
          this.admin.deleteGalleryGroup(group.id).subscribe();
          this.errorMessage = this.getSaveErrorMessage(error);
        }
      }),
      error: error => { this.busy = false; this.errorMessage = this.getSaveErrorMessage(error); }
    });
  }

  renameGroup(group: AdminGalleryGroup): void {
    const title = window.prompt('Nouveau titre du groupe', group.title)?.trim();
    if (!title || title === group.title || this.busy) return;
    this.busy = true;
    this.admin.updateGalleryGroup(group.id, title).pipe(finalize(() => this.busy = false)).subscribe({
      next: updated => {
        this.galleryGroups = this.galleryGroups.map(current => current.id === group.id ? updated : current);
        this.items = this.items.map(item => item.groupId === group.id ? { ...item, groupTitle: updated.title } : item);
        this.successMessage = 'Le titre du groupe a été modifié.';
      },
      error: error => this.errorMessage = this.getSaveErrorMessage(error)
    });
  }

  deleteGroup(group: AdminGalleryGroup): void {
    if (!window.confirm(`Supprimer le groupe « ${group.title} » ? Les photos resteront dans la galerie sans groupe.`) || this.busy) return;
    this.busy = true;
    this.admin.deleteGalleryGroup(group.id).pipe(finalize(() => this.busy = false)).subscribe({
      next: () => {
        this.galleryGroups = this.galleryGroups.filter(current => current.id !== group.id);
        this.items = this.items.map(item => item.groupId === group.id ? { ...item, groupId: null, groupTitle: null } : item);
        if (this.form.groupId === group.id) this.form = { ...this.form, groupId: null };
        this.successMessage = 'Le groupe a été supprimé. Les photos ont été conservées.';
      },
      error: error => this.errorMessage = this.getSaveErrorMessage(error)
    });
  }

  logout(): void { this.admin.logout().subscribe({ next: () => this.router.navigateByUrl('/admin/login'), error: () => this.errorMessage = 'Déconnexion impossible. Fermez votre navigateur pour terminer la session.' }); }

  private addFiles(files: File[]): void {
    this.imageErrorMessage = '';
    for (const file of files) {
      if (!this.validateFile(file)) return;
    }
    const previousCount = this.pendingFiles.length;
    const nextFiles = [...this.pendingFiles, ...files.filter(file => !this.pendingFiles.some(current => current.name === file.name && current.size === file.size && current.lastModified === file.lastModified))];
    this.pendingFiles = nextFiles;
    if (!nextFiles.length || nextFiles.length === previousCount) return;
    if (previousCount === 0 || (!this.pendingGroupId && nextFiles.length > 1)) {
      const suggestedTitle = this.suggestGroupTitle(nextFiles);
      const existing = this.galleryGroups.find(group => group.title.trim().toLocaleLowerCase() === suggestedTitle.toLocaleLowerCase());
      const sameRootItems = this.items.filter(item => !item.groupId && this.groupRoot(item.title).toLocaleLowerCase() === suggestedTitle.toLocaleLowerCase());
      this.pendingGroupId = existing?.id ?? (nextFiles.length > 1 ? '__new__' : null);
      if (!existing && sameRootItems.length && !this.pendingGroupId) this.pendingGroupId = '__new__';
      this.pendingGroupItemIds = sameRootItems.map(item => item.id);
      this.pendingGroupTitle = existing?.title ?? suggestedTitle;
    }
  }
  private validateFile(file: File): boolean {
    if (file.size > 10 * 1024 * 1024) { this.imageErrorMessage = `${file.name} dépasse 10 Mo. Choisissez une image plus légère.`; return false; }
    const supportedMimeType = ['image/jpeg', 'image/png'].includes(file.type);
    const supportedExtension = /\.(jpe?g|png)$/i.test(file.name);
    if (!supportedMimeType && !supportedExtension) { this.imageErrorMessage = `${file.name} n’est pas une image JPG ou PNG.`; return false; }
    return true;
  }
  private persistOrder(reordered: AdminGalleryItem[]): void {
    this.ordering = true;
    this.clearMessages();
    this.admin.reorderGallery(reordered.map(item => item.id)).pipe(finalize(() => this.ordering = false)).subscribe({
      next: () => { this.items = reordered; this.successMessage = 'Ordre de la galerie enregistré.'; },
      error: error => this.errorMessage = error.status === 401 || error.status === 403 ? 'Votre session a expiré. Reconnectez-vous.' : 'Impossible d’enregistrer le nouvel ordre. Réessayez.'
    });
  }
  private loadItems(): void {
    this.loading = true;
    this.admin.getGallery().subscribe({ next: items => { this.items = items; this.loading = false; }, error: () => { this.loading = false; this.errorMessage = 'Impossible de charger la galerie. Rechargez la page ou reconnectez-vous.'; } });
  }
  private loadGroups(): void {
    this.admin.getGalleryGroups().subscribe({ next: groups => this.galleryGroups = groups, error: () => this.errorMessage = 'Impossible de charger les groupes de la galerie.' });
  }
  private emptyForm(): GalleryFormValue { return { title: '', caption: '', category: 'BALAYAGE', instagramUrl: '', published: true, groupId: null }; }
  private titleFromFile(name: string): string { return name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Nouvelle réalisation'; }
  private suggestGroupTitle(files: File[]): string {
    const roots = files.map(file => this.groupRoot(file.name)).filter(Boolean);
    if (!roots.length) return 'Nouvelle série';
    let prefix = roots[0];
    for (const root of roots.slice(1)) {
      while (prefix && !root.toLocaleLowerCase().startsWith(prefix.toLocaleLowerCase())) prefix = prefix.slice(0, -1);
    }
    const common = prefix.replace(/[\s_-]+$/, '').trim();
    return (common.length >= 3 ? common : roots.length === 1 ? roots[0] : 'Nouvelle série').slice(0, 120);
  }
  private groupRoot(value: string): string { return this.titleFromFile(value).replace(/[\s_-]*(?:\(\d+\)|\d+)$/, '').trim(); }
  private clearMessages(): void { this.errorMessage = ''; this.successMessage = ''; }
  private getSaveErrorMessage(error: { error?: { message?: string }; status?: number; name?: string }): string {
    if (error.name === 'TimeoutError') return 'L’enregistrement prend trop de temps. Vérifiez votre connexion et réessayez.';
    if (error.status === 0) return 'Le serveur ne répond pas. Vérifiez que le backend est démarré.';
    if (error.status === 401 || error.status === 403) return 'Votre session a expiré. Reconnectez-vous.';
    if (error.status === 413) return 'Cette photo est trop volumineuse. Choisissez une photo de 10 Mo maximum.';
    if (error.status === 400) return error.error?.message ?? 'Les informations ou la photo ne sont pas valides.';
    return error.error?.message ?? 'Enregistrement impossible pour le moment. Réessayez.';
  }
}
