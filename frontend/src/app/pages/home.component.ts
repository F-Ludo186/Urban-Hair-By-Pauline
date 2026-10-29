import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="hero">
      <img class="hero-image" src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=2000&q=85" alt="Ambiance lumineuse d’un salon de coiffure" />
      <div class="hero-shade"></div>
      <div class="hero-content">
        <p class="eyebrow light">SALON DE COIFFURE · BEAUTÉ AU NATUREL</p>
        <h1>Révélez votre<br><em>beauté singulière.</em></h1>
        <p class="hero-copy">Une parenthèse de douceur, des gestes experts et une coiffure qui vous ressemble.</p>
        <a class="button button-light" href="mailto:bonjour@urbanhair.fr">Découvrir le salon <span>↗</span></a>
      </div>
      <span class="hero-index">01 — 03</span>
    </section>
    <section class="intro section-wrap">
      <p class="eyebrow">L’ESPRIT URBAN HAIR</p>
      <div class="intro-grid"><h2>La beauté prend<br><em>son temps.</em></h2><div><p>Chez Urban Hair by Pauline, chaque rendez-vous est une rencontre. Nous imaginons avec vous une coupe et une couleur qui révèlent votre personnalité, dans une atmosphère chaleureuse et apaisante.</p><a class="text-link" routerLink="/galerie">Explorer nos réalisations <span>↗</span></a></div></div>
    </section>
    <section class="feature-band">
      <div class="feature-image"><img src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1100&q=85" alt="Espace de coiffure accueillant" loading="lazy"></div>
      <div class="feature-copy"><p class="eyebrow">LE SALON</p><h2>Un savoir-faire<br>tout en <em>délicatesse.</em></h2><p>Des conseils personnalisés, des produits soigneusement sélectionnés et une attention portée à chaque détail.</p><a class="button button-dark" routerLink="/boutique">Voir la boutique <span>↗</span></a></div>
    </section>
    <section class="quote section-wrap"><span class="quote-mark">“</span><blockquote>Parce que se sentir bien dans ses cheveux, c’est déjà se sentir un peu plus soi.</blockquote><p>PAULINE · FONDATRICE</p><a class="home-admin-link" routerLink="/admin/login">Accès administrateur</a></section>
  `
})
export class HomeComponent {}
