import { AsyncPipe } from '@angular/common';
import { Component, HostListener, inject, OnDestroy } from '@angular/core';
import { map } from 'rxjs';
import { CatalogService, GalleryItem } from '../data/catalog.service';

interface GalleryAlbum {
  id: string;
  title: string;
  description: string;
  sortOrder: number;
  coverItemId: string | null;
  items: GalleryItem[];
  displayItems: GalleryItem[];
}

@Component({
  standalone: true,
  imports: [AsyncPipe],
  template: `
    <section class="page-hero"><p class="eyebrow">COUPES · COULEURS · INSPIRATION</p><h1>Le geste <em>juste.</em></h1><p>Quelques instants et transformations capturés au salon.</p></section>
    @if (albums$ | async; as albums) {
      @if (albums.length) {
        <div class="gallery-grid">
          @for (album of albums; track album.id) {
            @for (item of album.displayItems; track item.id) {
              <figure [class.gallery-group-cover]="album.id !== 'ungrouped'" role="button" tabindex="0" (click)="openPhoto(item, album.items)" (keydown.enter)="openPhoto(item, album.items)" (keydown.space)="openPhoto(item, album.items); $event.preventDefault()" [attr.aria-label]="album.id !== 'ungrouped' ? album.title + ', ' + album.items.length + ' photos' : 'Agrandir la photo : ' + item.title">
                <img [src]="item.imageUrl" [alt]="item.title" loading="lazy">
                @if (album.id !== 'ungrouped') {
                  <figcaption class="gallery-group-overlay">
                    <span class="gallery-group-title">{{ album.title }}</span>
                    <span class="gallery-group-count">{{ album.items.length }} {{ album.items.length > 1 ? 'photos' : 'photo' }}</span>
                  </figcaption>
                } @else {
                  <figcaption>{{ item.title }}{{ item.caption ? ' — ' + item.caption : '' }}</figcaption>
                }
              </figure>
            }
          }
        </div>
      } @else {
        <p class="gallery-empty">Les prochaines réalisations arrivent bientôt.</p>
      }
    }
    @if (selectedPhoto; as photo) {
      <div class="photo-lightbox" (click)="closePhoto()">
        <section class="photo-lightbox-dialog" role="dialog" aria-modal="true" aria-label="Photo de la galerie" (click)="$event.stopPropagation()">
          <button class="lightbox-close" type="button" (click)="closePhoto()" aria-label="Fermer la photo">×</button>
          <div class="photo-lightbox-image">
            <button class="lightbox-arrow lightbox-previous" type="button" (click)="movePhoto(-1)" [disabled]="selectedIndex === 0" aria-label="Photo précédente">‹</button>
            <img [src]="photo.imageUrl" [alt]="photo.title">
            <button class="lightbox-arrow lightbox-next" type="button" (click)="movePhoto(1)" [disabled]="selectedIndex === photoItems.length - 1" aria-label="Photo suivante">›</button>
          </div>
          <aside class="photo-lightbox-copy">
            <p class="eyebrow">{{ photo.groupTitle || 'RÉALISATION AU SALON' }}</p>
            <h2>{{ photo.groupTitle || photo.title }}</h2>
            @if (photo.groupDescription) { <p class="lightbox-caption">{{ photo.groupDescription }}</p> }
            <small>{{ selectedIndex + 1 }} / {{ photoItems.length }}</small>
          </aside>
        </section>
      </div>
    }
    <section class="gallery-cta"><p>Votre prochaine inspiration commence ici.</p><a class="button button-dark" href="mailto:bonjour@urbanhair.fr">Parlons de vos envies <span>↗</span></a></section>
  `
})
export class GalleryComponent implements OnDestroy {
  photoItems: GalleryItem[] = [];
  selectedPhoto: GalleryItem | null = null;
  selectedIndex = 0;
  private previousBodyOverflow = '';

  albums$ = inject(CatalogService).getGallery().pipe(map(items => {
    const albums = new Map<string, GalleryAlbum>();
    for (const item of items) {
      const id = item.groupId ?? 'ungrouped';
      let album = albums.get(id);
      if (!album) {
        album = { id, title: item.groupTitle ?? '', description: item.groupDescription ?? '', sortOrder: item.groupSortOrder, coverItemId: item.groupCoverItemId, items: [], displayItems: [] };
        albums.set(id, album);
      }
      album.items.push(item);
    }
    const sections = [...albums.values()].sort((a, b) => {
      if (a.id === 'ungrouped') return 1;
      if (b.id === 'ungrouped') return -1;
      return a.sortOrder - b.sortOrder;
    });
    for (const album of sections) {
      album.displayItems = album.id === 'ungrouped'
        ? album.items
        : [album.items.find(item => item.id === album.coverItemId) ?? album.items[0]];
    }
    return sections;
  }));

  openPhoto(item: GalleryItem, albumItems: GalleryItem[]): void {
    this.photoItems = albumItems;
    const index = albumItems.findIndex(photo => photo.id === item.id);
    if (index < 0) return;
    this.selectedIndex = index;
    this.selectedPhoto = albumItems[index];
    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  movePhoto(direction: number): void {
    const nextIndex = this.selectedIndex + direction;
    if (nextIndex < 0 || nextIndex >= this.photoItems.length) return;
    this.selectedIndex = nextIndex;
    this.selectedPhoto = this.photoItems[nextIndex];
  }

  closePhoto(): void {
    this.selectedPhoto = null;
    document.body.style.overflow = this.previousBodyOverflow;
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.selectedPhoto) return;
    if (event.key === 'Escape') { this.closePhoto(); event.preventDefault(); }
    else if (event.key === 'ArrowLeft') { this.movePhoto(-1); event.preventDefault(); }
    else if (event.key === 'ArrowRight') { this.movePhoto(1); event.preventDefault(); }
  }

  ngOnDestroy(): void {
    if (this.selectedPhoto) document.body.style.overflow = this.previousBodyOverflow;
  }
}
