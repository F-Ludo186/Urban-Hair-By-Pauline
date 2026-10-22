import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { CatalogService } from '../data/catalog.service';

@Component({
  standalone: true,
  imports: [AsyncPipe],
  template: `
    <section class="page-hero"><p class="eyebrow">COUPES · COULEURS · INSPIRATION</p><h1>Le geste <em>juste.</em></h1><p>Quelques instants et transformations capturés au salon.</p></section>
    <section class="gallery-grid section-wrap" aria-label="Galerie des réalisations">
      @if (items$ | async; as items) {
        @for (item of items; track item.id; let i = $index) {
          <figure [class.tall]="i === 1 || i === 4">
            <img [src]="item.imageUrl" [alt]="item.title" loading="lazy">
            <figcaption>
              <div><span>{{ item.title }}</span>@if (item.caption) { <p>{{ item.caption }}</p> }</div>
              <small>{{ item.category }}</small>
            </figcaption>
          </figure>
        } @empty {
          <p class="gallery-empty">Les prochaines réalisations arrivent bientôt.</p>
        }
      }
    </section>
    <section class="gallery-cta"><p>Votre prochaine inspiration commence ici.</p><a class="button button-dark" href="mailto:bonjour@urbanhair.fr">Parlons de vos envies <span>↗</span></a></section>
  `
})
export class GalleryComponent {
  items$ = inject(CatalogService).getGallery();
}
