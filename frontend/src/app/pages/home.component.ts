import { Component, OnInit, inject } from '@angular/core';
import { HomeContentService, HomeSection } from '../data/home-content.service';
import { HomeSectionsComponent } from './home-sections.component';

@Component({
  standalone: true,
  imports: [HomeSectionsComponent],
  template: `
    @if (errorMessage) { <p class="home-load-error" role="alert">{{ errorMessage }}</p> }
    <app-home-sections [sections]="sections"></app-home-sections>
  `
})
export class HomeComponent implements OnInit {
  private readonly homeContent = inject(HomeContentService);
  sections: HomeSection[] = [];
  errorMessage = '';

  ngOnInit(): void {
    this.homeContent.getSections().subscribe({
      next: sections => this.sections = sections,
      error: () => this.errorMessage = 'Le contenu de la page d’accueil est momentanément indisponible.'
    });
  }
}
