import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AdminService } from '../data/admin.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="admin-dashboard">
      <header class="admin-dashboard-header">
        <a class="brand" routerLink="/">URBAN HAIR<span>by Pauline</span></a>
        <p class="eyebrow">ESPACE D’ADMINISTRATION</p>
        <a class="admin-dashboard-site-link" routerLink="/">Retour au site <span>↗</span></a>
      </header>

      <main class="admin-dashboard-main">
        <p class="eyebrow">VOTRE ESPACE DE GESTION</p>
        <h1>Que souhaitez-vous <em>gérer ?</em></h1>
        <p class="admin-dashboard-intro">Choisissez un espace pour modifier le contenu du site.</p>

        <section class="admin-module-grid" aria-label="Espaces de gestion">
          <a class="admin-module-card" routerLink="/admin/galerie">
            <span class="admin-module-symbol" aria-hidden="true">✦</span>
            <p class="eyebrow">PHOTOS &amp; INSPIRATION</p>
            <h2>Galerie</h2>
            <p>Organisez les groupes, leurs photos, leurs textes et leur ordre d’affichage.</p>
            <span class="admin-module-action">Gérer la galerie <span aria-hidden="true">→</span></span>
          </a>

          <a class="admin-module-card" routerLink="/admin/boutique">
            <span class="admin-module-symbol" aria-hidden="true">◇</span>
            <p class="eyebrow">PRODUITS &amp; SOINS</p>
            <h2>Boutique</h2>
            <p>Gérez vos fiches, photos, prix, promotions, stocks et mises en avant.</p>
            <span class="admin-module-action">Gérer la boutique <span aria-hidden="true">→</span></span>
          </a>

          <article class="admin-module-card admin-module-upcoming" aria-disabled="true">
            <span class="admin-module-status">À venir</span>
            <span class="admin-module-symbol" aria-hidden="true">⌂</span>
            <p class="eyebrow">PRÉSENTATION DU SALON</p>
            <h2>Page d’accueil</h2>
            <p>Gestion des textes et des contenus de présentation.</p>
          </article>
        </section>

        <button class="admin-dashboard-logout" type="button" (click)="logout()">Se déconnecter</button>
      </main>
    </div>
  `
})
export class AdminHomeComponent {
  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);

  logout(): void {
    this.admin.logout().subscribe({
      next: () => this.router.navigateByUrl('/admin/login'),
      error: () => this.router.navigateByUrl('/admin/login')
    });
  }
}
