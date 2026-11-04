import { Component } from '@angular/core';

@Component({
  standalone: true,
  template: `
    <section class="page-hero">
      <p class="eyebrow">URBAN HAIR BY PAULINE</p>
      <h1>Contact <em>& rendez-vous.</em></h1>
      <p>Coiffure, style et conseils à Sainte-Catherine-de-Fierbois.</p>
    </section>

    <section class="contact-page section-wrap" aria-label="Coordonnées du salon">
      <article class="contact-card">
        <p class="eyebrow">NOUS JOINDRE</p>
        <h2>Parlons de vos envies.</h2>

        <a class="contact-detail" href="tel:+33247654953">
          <span class="contact-icon" aria-hidden="true">☎</span>
          <span><small>Téléphone</small><strong>02 47 65 49 53</strong></span>
        </a>

        <a
          class="contact-detail"
           href="https://www.google.com/maps/search/?api=1&query=Urban+Hair+By+Pauline%2C+53+ter+Rue+Boucicault%2C+37800+Sainte-Catherine-de-Fierbois"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span class="contact-icon" aria-hidden="true">⌖</span>
          <span><small>Adresse</small><strong>Sainte-Catherine-de-Fierbois</strong></span>
        </a>

        <p class="contact-appointment">Le salon vous reçoit sur rendez-vous.</p>

        <a
          class="button button-dark"
          href="https://www.planity.com/urban-hair-by-pauline-37800-sainte-catherine-de-fierbois"
          target="_blank"
          rel="noopener noreferrer"
        >
          Prendre rendez-vous sur Planity <span>↗</span>
        </a>
      </article>
    </section>
  `
})
export class ContactComponent {}