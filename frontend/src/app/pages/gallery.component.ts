import { AsyncPipe } from '@angular/common';
import { Component, HostListener, inject, OnDestroy } from '@angular/core';
import { map } from 'rxjs';
import { CatalogService, GalleryItem } from '../data/catalog.service';

@Component({
  standalone: true,
  imports: [AsyncPipe],
  template: `
    <section class="page-hero"><p class="eyebrow">COUPES · COULEURS · INSPIRATION</p><h1>Le geste <em>juste.</em></h1><p>Quelques instants et transformations capturés au salon.</p></section>
    @if (albums$ | async; as albums) {
      @for (album of albums; track album.id) {
        <section class="gallery-album" [attr.aria-label]="album.title || 'Autres réalisations'">
          @if (album.title) { <h2>{{ album.title }}</h2> }
          <div class="gallery-grid">
            @for (item of album.items; track item.id) {
              <figure role="button" tabindex="0" (click)="openPhoto(item)" (keydown.enter)="openPhoto(item)" (keydown.space)="openPhoto(item); $event.preventDefault()" [attr.aria-label]="'Agrandir la photo : ' + item.title">
                <img [src]="item.imageUrl" [alt]="item.title" loading="lazy">
                <figcaption>{{ item.title }}{{ item.caption ? ' — ' + item.caption : '' }}</figcaption>
              </figure>
            }
          </div>
        </section>
      } @empty {
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
            <h2>{{ photo.title }}</h2>
            <p class="lightbox-category">{{ photo.category }}</p>
            @if (photo.caption) { <p class="lightbox-caption">{{ photo.caption }}</p> }
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
    const albums = new Map<string, { id: string; title: string; items: GalleryItem[] }>();
    for (const item of items) {
      const id = item.groupId ?? 'ungrouped';
      let album = albums.get(id);
      if (!album) {
        album = { id, title: item.groupTitle ?? '', items: [] };
        albums.set(id, album);
      }
      album.items.push(item);
    }
    const sections = [...albums.values()];
    this.photoItems = sections.flatMap(album => album.items);
    return sections;
  }));

  openPhoto(item: GalleryItem): void {
    const index = this.photoItems.findIndex(photo => photo.id === item.id);
    if (index < 0) return;
    this.selectedIndex = index;
    this.selectedPhoto = this.photoItems[index];
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
