import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'uh-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    @if (!isAdminRoute()) {
      <div class="announcement">L’élégance au naturel · Prenez un moment pour vous</div>
      <header class="site-header">
        <a class="brand" routerLink="/" aria-label="Urban Hair, accueil">URBAN HAIR<span>by Pauline</span></a>
        <nav aria-label="Navigation principale">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Accueil</a>
          <a routerLink="/boutique" routerLinkActive="active">Boutique</a>
          <a routerLink="/galerie" routerLinkActive="active">Galerie</a>
        </nav>
        <a class="header-cta" href="mailto:bonjour@urbanhair.fr">Prendre rendez-vous <span>↗</span></a>
      </header>
    }
    <main><router-outlet /></main>
    @if (!isAdminRoute()) {
      <footer class="site-footer">
        <a class="brand footer-brand" routerLink="/">URBAN HAIR<span>by Pauline</span></a>
        <p>Un lieu, une signature, votre beauté.</p>
        <div><a routerLink="/boutique">Boutique</a><a routerLink="/galerie">Galerie</a><a href="mailto:bonjour@urbanhair.fr">Contact</a></div>
        <small>© 2026 Urban Hair by Pauline</small>
      </footer>
    }
  `
})
export class AppComponent {
  private readonly router = inject(Router);

  isAdminRoute(): boolean {
    return this.router.url.startsWith('/admin');
  }
}
