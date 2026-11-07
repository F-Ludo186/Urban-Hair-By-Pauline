import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable, finalize, of, switchMap, timeout } from 'rxjs';
import { AdminGalleryGroup, AdminGalleryItem, AdminService, GalleryFormValue } from '../data/admin.service';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="gallery-admin">
      <header class="gallery-admin-header">
        <a class="admin-brand" routerLink="/">URBAN HAIR<span>by Pauline</span></a>
        <div class="gallery-admin-heading"><p class="eyebrow">ESPACE PRIVÉ</p><h1>Votre galerie</h1></div>
        <div class="gallery-admin-actions"><a routerLink="/admin">Tableau de bord</a><a routerLink="/galerie" target="_blank" rel="noopener">Voir le site ↗</a><button type="button" (click)="logout()">Déconnexion</button></div>
      </header>
      @if (successMessage) { <p class="admin-success gallery-admin-message" role="status">{{ successMessage }}</p> }
      @if (errorMessage) { <p class="admin-error gallery-admin-message" role="alert">{{ errorMessage }}</p> }

      <div class="gallery-workspace">
        <aside class="gallery-manager" aria-label="Gestion des groupes de la galerie">
          <div class="panel-heading"><div><p class="eyebrow">VOTRE CONTENU</p><h2>Gérer les groupes</h2></div><span class="gallery-count">{{ galleryGroups.length }} groupe{{ galleryGroups.length > 1 ? 's' : '' }}</span></div>

          <label class="upload-zone" [class.upload-zone-active]="isDraggingFile" (dragover)="onFileDragOver($event)" (dragleave)="onFileDragLeave($event)" (drop)="onFileDrop($event)">
            <input type="file" accept="image/jpeg,image/png" multiple (change)="selectImages($event)" [disabled]="busy" aria-label="Choisir une ou plusieurs photos">
            <span class="upload-icon">＋</span><strong>Déposez vos photos ici</strong><span>ou cliquez pour parcourir · JPG ou PNG · 10 Mo max.</span>
          </label>
          <details class="admin-editor gallery-url-editor">
            <summary>Ajouter une photo depuis une URL HTTPS</summary>
            <form (ngSubmit)="addExternalGalleryImage()" #externalImageForm="ngForm">
              <label class="admin-field">URL directe de l’image<input name="externalImageUrl" type="url" [(ngModel)]="externalImageUrl" (ngModelChange)="suggestExternalImageTitle($event)" maxlength="1000" pattern="https://.+" placeholder="https://…" required></label>
              <label class="admin-field">Titre de la photo et du nouveau groupe<input name="externalImageTitle" [(ngModel)]="externalImageTitle" maxlength="120" required></label>
              <label class="admin-field">Groupe<select name="externalImageGroupId" [(ngModel)]="externalImageGroupId" required>@for (group of galleryGroups; track group.id) {<option [ngValue]="group.id">{{ group.title }}</option>}<option value="__new__">Créer un nouveau groupe</option></select></label>
              <button class="button button-dark full-button" type="submit" [disabled]="busy || !externalImageForm.valid">{{ busy ? 'Ajout en cours…' : 'Ajouter la photo par URL' }}</button>
            </form>
          </details>
          @if (imageErrorMessage) { <p class="admin-error" role="alert">{{ imageErrorMessage }}</p> }
          @if (pendingFiles.length) {
            <div class="pending-files">
              <strong>{{ pendingFiles.length }} photo{{ pendingFiles.length > 1 ? 's' : '' }} prête{{ pendingFiles.length > 1 ? 's' : '' }}</strong>
              <div class="pending-list">@for (file of pendingFiles; track file.name + file.lastModified; let i = $index) {<span>{{ file.name }} <button type="button" (click)="removePending(i)" [disabled]="busy" [attr.aria-label]="'Retirer ' + file.name">×</button></span>}</div>
              <label class="admin-field pending-group-field">Groupe<select name="pendingGroupId" [(ngModel)]="pendingGroupId" [disabled]="busy" required><option [ngValue]="null" disabled>Choisir un groupe</option><option value="__new__">Créer un nouveau groupe</option>@for (group of galleryGroups; track group.id) {<option [ngValue]="group.id">{{ group.title }}</option>}</select></label>
              @if (pendingGroupId === '__new__') { <label class="admin-field pending-group-field">Titre du groupe<input name="pendingGroupTitle" [(ngModel)]="pendingGroupTitle" maxlength="120" placeholder="Ex. Balayage miel"></label> }
              @if (uploadProgress) { <p class="upload-progress" role="status">{{ uploadProgress }}</p> }
              <button class="button button-dark full-button" type="button" (click)="startPendingUpload()" [disabled]="busy">{{ busy ? 'Ajout en cours…' : 'Ajouter à la galerie' }}</button>
            </div>
          }

          @if (galleryGroups.length) {
            <div class="gallery-group-list">
              <h4>Groupes · ordre d’affichage</h4>
              @for (group of galleryGroups; track group.id; let i = $index) {
                <div class="gallery-group-row">
                  <div class="group-row-heading"><span><strong>{{ group.title }}</strong><small>{{ group.itemCount }} photo{{ group.itemCount > 1 ? 's' : '' }}</small></span><button type="button" (click)="moveGroup(i, -1)" [disabled]="i === 0 || ordering" [attr.aria-label]="'Monter le groupe ' + group.title">↑</button><button type="button" (click)="moveGroup(i, 1)" [disabled]="i === galleryGroups.length - 1 || ordering" [attr.aria-label]="'Descendre le groupe ' + group.title">↓</button><button type="button" (click)="editGroup(group)" [disabled]="busy" [attr.aria-expanded]="editingGroupId === group.id" [attr.aria-controls]="'group-editor-' + group.id">{{ editingGroupId === group.id ? 'Fermer' : 'Modifier' }}</button><button type="button" class="delete-thumb" (click)="deleteGroup(group)" [disabled]="busy" [attr.aria-label]="'Supprimer le groupe ' + group.title">×</button></div>
                  @if (editingGroupId === group.id) {
                    <div class="group-editor" [id]="'group-editor-' + group.id">
                    <label class="admin-field">Titre du groupe<input [name]="'group-title-' + group.id" [(ngModel)]="groupTitleDraft" maxlength="120" required></label>
                    <label class="admin-field">Texte du groupe<textarea [name]="'group-description-' + group.id" [(ngModel)]="groupDescriptionDraft" maxlength="2000" rows="3" placeholder="Présentez cette série de photos"></textarea></label>
                    @if (coverOptions(group.id).length) {
                      <label class="admin-field group-cover-field">Photo mise en avant<select [name]="'cover-' + group.id" [(ngModel)]="groupCoverSelections[group.id]"><option value="">Choisir une photo</option>@for (item of coverOptions(group.id); track item.id) {<option [ngValue]="item.id">{{ item.title }}</option>}</select></label>
                    }
                    <div class="editor-buttons"><button class="group-cover-save" type="button" (click)="saveGroup(group)">Enregistrer le groupe</button><button class="group-cover-save" type="button" (click)="saveGroupCover(group)" [disabled]="busy || !groupCoverSelections[group.id]">Enregistrer la couverture</button></div>
                    <div class="group-photo-order"><strong>Photos du groupe · glisser pour réordonner</strong>
                      <ol class="thumbnail-list" (dragover)="onThumbDragOver($event)" (drop)="dropThumbnail($event)">
                        @for (item of groupItems(group.id); track item.id; let photoIndex = $index) {
                          <li [class.thumbnail-drop-target]="dropTargetIndex === photoIndex" draggable="true" (dragstart)="startThumbnailDrag($event, photoIndex)" (dragenter)="setDropTarget(photoIndex)" (dragend)="endThumbnailDrag()"><span class="drag-handle" aria-hidden="true">⠿</span><img [src]="item.imageUrl" alt="" loading="lazy"><span class="thumbnail-details"><strong>{{ item.title }}</strong><small>{{ item.published ? 'Publié' : 'Brouillon' }}</small></span><button type="button" class="delete-thumb" (click)="deleteItem(item)" [attr.aria-label]="'Supprimer ' + item.title">×</button></li>
                        }
                      </ol>
                    </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
          @if (groupsLoading) { <p class="admin-empty">Chargement des groupes…</p> }
          @else if (groupsLoadError) { <div class="admin-error" role="alert">{{ groupsLoadError }} <button type="button" (click)="loadGroups()">Réessayer</button></div> }
          @else if (!galleryGroups.length) { <p class="thumbnail-empty">Créez un groupe en ajoutant des photos ci-dessus.</p> }
        </aside>

        <main class="gallery-live-preview">
          <div class="preview-toolbar"><div><p class="eyebrow">APERÇU EN DIRECT</p><h2>Page galerie</h2></div><span class="preview-status"><i></i> Les changements s’affichent ici</span></div>
          <div class="preview-page">
            <div class="preview-site-header"><span>URBAN HAIR <em>by Pauline</em></span><nav>Accueil&nbsp;&nbsp;&nbsp; Boutique&nbsp;&nbsp;&nbsp; <u>Galerie</u></nav><small>Prendre rendez-vous ↗</small></div>
            <section class="preview-hero"><p class="eyebrow">COUPES · COULEURS · INSPIRATION</p><h2>Le geste <em>juste.</em></h2><p>Quelques instants et transformations capturés au salon.</p></section>
            @if (loading) { <p class="preview-empty">Chargement de la galerie…</p> }
            @else {
              @if (previewCards.length) {
                <section class="preview-gallery" aria-label="Groupes de la galerie">
                  @for (card of previewCards; track card.id) {
                    <div class="preview-group-card">
                      <figure role="button" tabindex="0" (click)="openPreviewGroup(card.id)" (keydown.enter)="openPreviewGroup(card.id)" (keydown.space)="openPreviewGroup(card.id); $event.preventDefault()" [attr.aria-label]="card.title + ', ' + card.items.length + ' photos'">
                        <img [src]="card.item.imageUrl" [alt]="card.title"><figcaption><strong>{{ card.title }}</strong><small>{{ card.items.length }} {{ card.items.length > 1 ? 'photos' : 'photo' }}</small></figcaption>
                      </figure>
                      <button class="preview-group-edit" type="button" (click)="editPreviewGroup(card.id)" [disabled]="busy" [attr.aria-label]="'Modifier le groupe ' + card.title">Modifier</button>
                    </div>
                  }
                </section>
              } @else { <p class="preview-empty">Les prochaines réalisations arrivent bientôt.</p> }
            }
            <section class="preview-cta"><p>Votre prochaine inspiration commence ici.</p><span>PARLONS DE VOS ENVIES ↗</span></section>
            <footer class="preview-footer">URBAN HAIR <em>by Pauline</em></footer>
          </div>
        </main>
      </div>
      @if (previewAlbum; as album) {
        <div class="photo-lightbox" (click)="closePreviewGroup()">
          <section class="photo-lightbox-dialog" role="dialog" aria-modal="true" [attr.aria-label]="'Photos du groupe ' + album.title" (click)="$event.stopPropagation()">
            <button class="lightbox-close" type="button" (click)="closePreviewGroup()" aria-label="Fermer les photos">×</button>
            <div class="photo-lightbox-image">
              <button class="lightbox-arrow lightbox-previous" type="button" (click)="movePreviewPhoto(-1)" [disabled]="previewPhotoIndex === 0" aria-label="Photo précédente">‹</button>
              <img [src]="album.items[previewPhotoIndex].imageUrl" [alt]="album.items[previewPhotoIndex].title">
              <button class="lightbox-arrow lightbox-next" type="button" (click)="movePreviewPhoto(1)" [disabled]="previewPhotoIndex === album.items.length - 1" aria-label="Photo suivante">›</button>
            </div>
            <aside class="photo-lightbox-copy">
              <p class="eyebrow">{{ album.title }}</p>
              <h2>{{ album.title }}</h2>
              @if (album.description) { <p class="lightbox-caption">{{ album.description }}</p> }
              <small>{{ previewPhotoIndex + 1 }} / {{ album.items.length }}</small>
            </aside>
          </section>
        </div>
      }
    </div>
  `
})
export class AdminComponent implements OnInit, OnDestroy {
  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);
  private previousBodyOverflow = '';
  items: AdminGalleryItem[] = [];
  galleryGroups: AdminGalleryGroup[] = [];
  groupCoverSelections: Record<string, string> = {};
  filterGroupId = '__all__';
  pendingFiles: File[] = [];
  pendingGroupId: string | null = null;
  pendingGroupTitle = '';
  externalImageUrl = '';
  externalImageTitle = '';
  externalImageGroupId: string | null = '__new__';
  private suggestedExternalImageTitle = '';
  editingGroupId: string | null = null;
  groupTitleDraft = '';
  groupDescriptionDraft = '';
  draggedIndex: number | null = null;
  dropTargetIndex: number | null = null;
  loading = true;
  groupsLoading = true;
  groupsLoadError = '';
  busy = false;
  ordering = false;
  previewAlbum: { groupId: string; title: string; description: string; items: AdminGalleryItem[] } | null = null;
  previewPhotoIndex = 0;
  isDraggingFile = false;
  errorMessage = '';
  successMessage = '';
  imageErrorMessage = '';
  uploadProgress = '';

  get managedItems(): AdminGalleryItem[] {
    if (this.filterGroupId === '__all__') return this.items;
    if (this.filterGroupId === '__ungrouped__') return this.items.filter(item => !item.groupId);
    return this.items.filter(item => item.groupId === this.filterGroupId);
  }

  get previewGroups(): { id: string; title: string; description: string; items: AdminGalleryItem[]; sortOrder: number; coverItemId: string | null }[] {
    const groups = new Map<string, { id: string; title: string; description: string; items: AdminGalleryItem[]; sortOrder: number; coverItemId: string | null }>();
    for (const item of this.items.filter(current => current.published)) {
      const id = item.groupId;
      if (!id) continue;
      let group = groups.get(id);
      if (!group) {
        group = { id, title: item.groupTitle ?? '', description: item.groupDescription ?? '', items: [], sortOrder: item.groupSortOrder, coverItemId: item.groupCoverItemId };
        groups.set(id, group);
      }
      group.items.push(item);
    }
    return [...groups.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  get previewCards(): { id: string; title: string; description: string; items: AdminGalleryItem[]; item: AdminGalleryItem }[] {
    return this.previewGroups.map(group => ({
      id: group.id,
      title: group.title,
      description: group.description,
      items: group.items,
      item: group.items.find(item => item.id === group.coverItemId) ?? group.items[0]
    }));
  }

  ngOnInit(): void { this.loadItems(); this.loadGroups(); }

  selectImages(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  suggestExternalImageTitle(value: string): void {
    try {
      const filename = new URL(value.trim()).pathname.split('/').pop() ?? '';
      const title = this.titleFromFile(decodeURIComponent(filename));
      if (title && (!this.externalImageTitle || this.externalImageTitle === this.suggestedExternalImageTitle)) {
        this.externalImageTitle = title;
        this.suggestedExternalImageTitle = title;
      }
    } catch {
      return;
    }
  }

  addExternalGalleryImage(): void {
    if (this.busy) return;
    this.clearMessages();
    if (!this.isValidExternalImageUrl(this.externalImageUrl)) {
      this.errorMessage = 'Saisissez une URL d’image HTTPS valide.';
      return;
    }
    if (!this.externalImageTitle.trim()) {
      this.errorMessage = 'Saisissez un titre pour la photo.';
      return;
    }
    if (!this.externalImageGroupId) {
      this.errorMessage = 'Choisissez un groupe ou créez-en un pour cette photo.';
      return;
    }
    if (this.externalImageGroupId === '__new__') {
      const title = this.externalImageTitle.trim();
      this.busy = true;
      this.admin.createGalleryGroup(title).pipe(timeout(20_000)).subscribe({
        next: group => {
          this.galleryGroups = [...this.galleryGroups, group].sort((a, b) => a.sortOrder - b.sortOrder);
          this.saveExternalGalleryImage(group.id);
        },
        error: error => {
          this.busy = false;
          this.errorMessage = this.getSaveErrorMessage(error);
        }
      });
      return;
    }
    this.saveExternalGalleryImage(this.externalImageGroupId);
  }

  private saveExternalGalleryImage(groupId: string): void {
    this.busy = true;
    const value = {
      ...this.emptyForm(),
      title: this.externalImageTitle.trim(),
      groupId,
      imageUrl: this.externalImageUrl.trim()
    };
    this.admin.createGalleryItem(value).pipe(finalize(() => this.busy = false)).subscribe({
      next: created => {
        this.items = [...this.items, created];
        this.externalImageTitle = '';
        this.suggestedExternalImageTitle = '';
        this.externalImageUrl = '';
        this.externalImageGroupId = created.groupId;
        this.successMessage = `La photo « ${created.title} » a été ajoutée à la galerie.`;
        this.loadGroups();
      },
      error: error => this.errorMessage = this.getSaveErrorMessage(error)
    });
  }

  onFileDragOver(event: DragEvent): void { event.preventDefault(); this.isDraggingFile = true; }
  onFileDragLeave(event: DragEvent): void { if (!event.currentTarget || ! (event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) this.isDraggingFile = false; }
  onFileDrop(event: DragEvent): void { event.preventDefault(); this.isDraggingFile = false; this.addFiles(Array.from(event.dataTransfer?.files ?? [])); }

  startPendingUpload(): void {
    if (!this.pendingFiles.length || this.busy) return;
    const files = [...this.pendingFiles];
    this.clearMessages();
    if (!this.pendingGroupId) { this.errorMessage = 'Choisissez un groupe ou créez-en un avant d’ajouter les photos.'; return; }
    if (this.pendingGroupId === '__new__') {
      const title = this.pendingGroupTitle.trim();
      if (!title) { this.errorMessage = 'Saisissez un titre pour le nouveau groupe.'; return; }
      this.busy = true;
      this.admin.createGalleryGroup(title).pipe(timeout(20_000)).subscribe({
        next: group => {
          this.pendingGroupId = group.id;
          this.galleryGroups = [...this.galleryGroups, group];
          this.uploadProgress = `Groupe « ${group.title} » créé. Préparation de ${files.length} photo${files.length > 1 ? 's' : ''}…`;
          this.uploadNext(files, 0);
        },
        error: error => { this.busy = false; this.errorMessage = this.getSaveErrorMessage(error); }
      });
      return;
    }
    this.busy = true;
    this.uploadProgress = `Préparation de ${files.length} photo${files.length > 1 ? 's' : ''}…`;
    this.uploadNext(files, 0);
  }

  private uploadNext(files: File[], index: number): void {
    if (index >= files.length) {
      this.busy = false;
      this.uploadProgress = '';
      this.pendingFiles = [];
      this.pendingGroupId = null;
      this.pendingGroupTitle = '';
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
        if (created.groupId) {
          this.galleryGroups = this.galleryGroups.map(group => group.id === created.groupId ? { ...group, itemCount: group.itemCount + 1, coverItemId: group.coverItemId ?? created.groupCoverItemId ?? created.id } : group);
          this.groupCoverSelections[created.groupId] ??= created.groupCoverItemId ?? created.id;
        }
        this.uploadNext(files, index + 1);
      },
      error: error => { this.busy = false; this.uploadProgress = ''; this.pendingFiles = files.slice(index); this.errorMessage = `${file.name} : ${this.getSaveErrorMessage(error)} Les photos déjà ajoutées sont conservées.`; }
    });
  }

  removePending(index: number): void {
    this.pendingFiles = this.pendingFiles.filter((_, i) => i !== index);
    if (!this.pendingFiles.length) { this.pendingGroupId = null; this.pendingGroupTitle = ''; }
  }

  moveGroup(index: number, offset: number): void {
    const destination = index + offset;
    if (destination < 0 || destination >= this.galleryGroups.length || this.ordering) return;
    const reordered = [...this.galleryGroups];
    [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
    this.ordering = true;
    this.clearMessages();
    this.admin.reorderGalleryGroups(reordered.map(group => group.id)).pipe(finalize(() => this.ordering = false)).subscribe({
      next: () => {
        this.galleryGroups = reordered.map((group, sortOrder) => ({ ...group, sortOrder }));
        this.items = this.items.map(item => {
          const group = this.galleryGroups.find(current => current.id === item.groupId);
          return group ? { ...item, groupSortOrder: group.sortOrder } : item;
        });
        this.successMessage = 'Ordre des groupes enregistré.';
      },
      error: error => this.errorMessage = this.getSaveErrorMessage(error)
    });
  }

  groupItems(groupId: string): AdminGalleryItem[] { return this.items.filter(item => item.groupId === groupId); }
  coverOptions(groupId: string): AdminGalleryItem[] { return this.items.filter(item => item.groupId === groupId && item.published); }

  editGroup(group: AdminGalleryGroup): void {
    if (this.editingGroupId === group.id) {
      this.editingGroupId = null;
      this.filterGroupId = '__all__';
      return;
    }
    this.openGroupEditor(group);
  }

  editPreviewGroup(groupId: string): void {
    const group = this.galleryGroups.find(current => current.id === groupId);
    if (group) this.openGroupEditor(group);
  }

  private openGroupEditor(group: AdminGalleryGroup): void {
    this.editingGroupId = group.id;
    this.filterGroupId = group.id;
    this.groupTitleDraft = group.title;
    this.groupDescriptionDraft = group.description ?? '';
    const editorId = `group-editor-${group.id}`;
    setTimeout(() => document.getElementById(editorId)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }

  saveGroup(group: AdminGalleryGroup): void {
    const title = this.groupTitleDraft.trim();
    if (!title || this.busy) return;
    this.busy = true;
    this.admin.updateGalleryGroup(group.id, title, this.groupDescriptionDraft.trim()).pipe(finalize(() => this.busy = false)).subscribe({
      next: updated => {
        this.galleryGroups = this.galleryGroups.map(current => current.id === group.id ? updated : current);
        this.items = this.items.map(item => item.groupId === group.id ? { ...item, groupTitle: updated.title, groupDescription: updated.description } : item);
        this.successMessage = `Le groupe « ${updated.title} » a été enregistré.`;
      },
      error: error => this.errorMessage = this.getSaveErrorMessage(error)
    });
  }

  saveGroupCover(group: AdminGalleryGroup): void {
    const itemId = this.groupCoverSelections[group.id];
    if (!itemId || this.busy) return;
    this.busy = true;
    this.clearMessages();
    this.admin.setGalleryGroupCover(group.id, itemId).pipe(finalize(() => this.busy = false)).subscribe({
      next: updated => {
        this.galleryGroups = this.galleryGroups.map(current => current.id === group.id ? updated : current);
        this.items = this.items.map(item => item.groupId === group.id ? { ...item, groupCoverItemId: updated.coverItemId } : item);
        this.groupCoverSelections[group.id] = updated.coverItemId ?? '';
        this.successMessage = `La photo de couverture du groupe « ${group.title} » a été modifiée.`;
      },
      error: error => this.errorMessage = this.getSaveErrorMessage(error)
    });
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
    const visibleItems = this.managedItems;
    if (!Number.isInteger(from) || from < 0 || from >= visibleItems.length || target === null || from === target) { this.endThumbnailDrag(); return; }
    const reordered = [...visibleItems];
    const [item] = reordered.splice(from, 1);
    reordered.splice(target, 0, item);
    this.persistOrder(reordered);
    this.endThumbnailDrag();
  }
  endThumbnailDrag(): void { this.draggedIndex = null; this.dropTargetIndex = null; }

  openPreviewGroup(groupId: string): void {
    const group = this.previewGroups.find(current => current.id === groupId);
    if (!group || !group.items.length) return;
    this.previewAlbum = { groupId: group.id, title: group.title, description: group.description, items: group.items };
    const coverIndex = group.items.findIndex(item => item.id === group.coverItemId);
    this.previewPhotoIndex = coverIndex >= 0 ? coverIndex : 0;
    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  movePreviewPhoto(direction: number): void {
    if (!this.previewAlbum) return;
    const nextIndex = this.previewPhotoIndex + direction;
    if (nextIndex < 0 || nextIndex >= this.previewAlbum.items.length) return;
    this.previewPhotoIndex = nextIndex;
  }
  closePreviewGroup(): void {
    this.previewAlbum = null;
    document.body.style.overflow = this.previousBodyOverflow;
  }

  @HostListener('document:keydown', ['$event'])
  onPreviewKeydown(event: KeyboardEvent): void {
    if (!this.previewAlbum) return;
    if (event.key === 'Escape') { this.closePreviewGroup(); event.preventDefault(); }
    else if (event.key === 'ArrowLeft') { this.movePreviewPhoto(-1); event.preventDefault(); }
    else if (event.key === 'ArrowRight') { this.movePreviewPhoto(1); event.preventDefault(); }
  }

  ngOnDestroy(): void {
    if (this.previewAlbum) document.body.style.overflow = this.previousBodyOverflow;
  }

  deleteItem(item: AdminGalleryItem): void {
    if (!window.confirm(`Supprimer « ${item.title} » ? Cette action est définitive.`)) return;
    this.clearMessages();
    this.admin.deleteGalleryItem(item.id).subscribe({
      next: () => { this.items = this.items.filter(current => current.id !== item.id); this.loadItems(); this.loadGroups(); this.successMessage = 'La photo a été supprimée.'; },
      error: () => this.errorMessage = 'Suppression impossible. Réessayez.'
    });
  }

  deleteGroup(group: AdminGalleryGroup): void {
    if (!window.confirm(`Supprimer le groupe « ${group.title} » et toutes ses photos ? Cette action est définitive.`) || this.busy) return;
    this.busy = true;
    this.admin.deleteGalleryGroup(group.id).pipe(finalize(() => this.busy = false)).subscribe({
      next: () => {
        if (this.previewAlbum?.groupId === group.id) this.closePreviewGroup();
        this.galleryGroups = this.galleryGroups.filter(current => current.id !== group.id);
        this.items = this.items.filter(item => item.groupId !== group.id);
        if (this.editingGroupId === group.id) { this.editingGroupId = null; this.filterGroupId = '__all__'; }
        if (this.filterGroupId === group.id) this.filterGroupId = '__all__';
        this.successMessage = 'Le groupe et ses photos ont été supprimés.';
        delete this.groupCoverSelections[group.id];
        this.loadItems();
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
    if (previousCount === 0) {
      const suggestedTitle = this.suggestGroupTitle(nextFiles);
      const existing = this.galleryGroups.find(group => group.title.trim().toLocaleLowerCase() === suggestedTitle.toLocaleLowerCase());
      this.pendingGroupId = existing?.id ?? '__new__';
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
    let orderedItems = reordered;
    let request: Observable<void>;
    let groupIdToUpdate: string | null = null;
    let firstPublishedItem: AdminGalleryItem | undefined;
    if (this.filterGroupId !== '__all__' && this.filterGroupId !== '__ungrouped__') {
      groupIdToUpdate = this.filterGroupId;
      firstPublishedItem = reordered.find(item => item.published);
      request = this.admin.reorderGalleryGroupItems(groupIdToUpdate, reordered.map(item => item.id));
      orderedItems = [...this.items.filter(item => item.groupId !== groupIdToUpdate), ...reordered];
    } else {
      if (this.filterGroupId === '__ungrouped__') {
        const iterator = [...reordered];
        orderedItems = this.items.map(item => item.groupId ? item : iterator.shift()!);
      }
      request = this.admin.reorderGallery(orderedItems.map(item => item.id));
    }
    let orderSaved = false;
    request.pipe(
      switchMap(() => {
        this.items = orderedItems;
        orderSaved = true;
        const currentCoverId = this.galleryGroups.find(group => group.id === groupIdToUpdate)?.coverItemId;
        return groupIdToUpdate && firstPublishedItem && currentCoverId !== firstPublishedItem.id
          ? this.admin.setGalleryGroupCover(groupIdToUpdate, firstPublishedItem.id)
          : of(null);
      }),
      finalize(() => this.ordering = false)
    ).subscribe({
      next: updatedGroup => {
        if (updatedGroup) {
          this.galleryGroups = this.galleryGroups.map(group => group.id === updatedGroup.id ? updatedGroup : group);
          this.items = this.items.map(item => item.groupId === updatedGroup.id
            ? { ...item, groupCoverItemId: updatedGroup.coverItemId }
            : item);
          this.groupCoverSelections[updatedGroup.id] = updatedGroup.coverItemId ?? '';
        }
        this.successMessage = groupIdToUpdate && firstPublishedItem
          ? 'Ordre enregistré et première photo publiée mise en couverture.'
          : 'Ordre des photos enregistré.';
      },
      error: error => {
        const message = error.status === 401 || error.status === 403
          ? 'Votre session a expiré. Reconnectez-vous.'
          : this.getSaveErrorMessage(error);
        this.errorMessage = orderSaved
          ? `Ordre enregistré, mais la couverture n’a pas pu être mise à jour. ${message}`
          : `Impossible d’enregistrer le nouvel ordre. ${message}`;
      }
    });
  }
  private loadItems(): void {
    this.loading = true;
    this.admin.getGallery().subscribe({
      next: items => { this.items = items; this.loading = false; this.syncGroupCoverSelections(); },
      error: error => {
        this.loading = false;
        if (this.redirectForExpiredSession(error)) return;
        this.errorMessage = 'Impossible de charger les photos. Vérifiez que le serveur est démarré, puis réessayez.';
      }
    });
  }
  loadGroups(): void {
    this.groupsLoading = true;
    this.groupsLoadError = '';
    this.admin.getGalleryGroups().subscribe({
      next: groups => { this.galleryGroups = [...groups].sort((a, b) => a.sortOrder - b.sortOrder); this.groupsLoading = false; this.syncGroupCoverSelections(); },
      error: error => {
        this.groupsLoading = false;
        if (this.redirectForExpiredSession(error)) return;
        this.groupsLoadError = this.getSaveErrorMessage(error);
      }
    });
  }
  private redirectForExpiredSession(error: { status?: number }): boolean {
    if (error.status !== 401 && error.status !== 403) return false;
    void this.router.navigateByUrl('/admin/login');
    return true;
  }
  private syncGroupCoverSelections(): void {
    for (const group of this.galleryGroups) {
      const cover = group.coverItemId ?? this.items.find(item => item.groupId === group.id && item.published)?.id ?? '';
      this.groupCoverSelections[group.id] = cover;
    }
  }
  private emptyForm(): GalleryFormValue { return { title: '', caption: '', category: 'BALAYAGE', imageUrl: '', instagramUrl: '', published: true, groupId: null }; }
  private isValidExternalImageUrl(value: string): boolean {
    try {
      const url = new URL(value.trim());
      return url.protocol === 'https:' && url.hostname.length > 0;
    } catch {
      return false;
    }
  }
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
