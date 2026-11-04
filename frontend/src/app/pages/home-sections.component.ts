import { Component, Input } from '@angular/core';
import { HomeSection } from '../data/home-content.service';

@Component({
  selector: 'app-home-sections',
  standalone: true,
  template: `
    @for (section of sections; track section.id) {
      @switch (section.id) {
        @case ('hero') {
          <section class="hero" [class.hero-centered]="section.layout === 'hero-centered'">
            @if (section.imageUrl) { <img class="hero-image" [src]="section.imageUrl" [alt]="section.title" /> }
            <div class="hero-shade"></div>
            <div class="hero-content">
              @if (section.eyebrow) { <p class="eyebrow light">{{ section.eyebrow }}</p> }
              <h1>{{ section.title }}</h1>
              @if (section.body) { <p class="hero-copy">{{ section.body }}</p> }
              @if (section.linkLabel && section.linkUrl) { <a class="button button-light" [href]="section.linkUrl">{{ section.linkLabel }} <span>↗</span></a> }
            </div>
            <span class="hero-index">{{ section.sortOrder + 1 }} — 04</span>
          </section>
        }
        @case ('intro') {
          <section class="intro section-wrap">
            @if (section.eyebrow) { <p class="eyebrow">{{ section.eyebrow }}</p> }
            @if (section.imageUrl && section.layout !== 'text') {
              <div class="home-split-layout" [class.image-left]="section.layout === 'image-left'">
                <img [src]="section.imageUrl" [alt]="section.title" loading="lazy">
                <div class="home-split-copy">
                  <h2>{{ section.title }}</h2>
                  @if (section.body) { <p>{{ section.body }}</p> }
                  @if (section.linkLabel && section.linkUrl) { <a class="text-link" [href]="section.linkUrl">{{ section.linkLabel }} <span>↗</span></a> }
                </div>
              </div>
            } @else {
              <div class="intro-grid">
                <h2>{{ section.title }}</h2>
                <div>
                  @if (section.body) { <p>{{ section.body }}</p> }
                  @if (section.linkLabel && section.linkUrl) { <a class="text-link" [href]="section.linkUrl">{{ section.linkLabel }} <span>↗</span></a> }
                </div>
              </div>
            }
          </section>
        }
        @case ('feature') {
          <section class="feature-band" [class.feature-image-right]="section.layout === 'image-right'" [class.feature-text-only]="section.layout === 'text' || !section.imageUrl">
            @if (section.imageUrl && section.layout !== 'text') {
              <div class="feature-image"><img [src]="section.imageUrl" [alt]="section.title" loading="lazy"></div>
            }
            <div class="feature-copy">
              @if (section.eyebrow) { <p class="eyebrow">{{ section.eyebrow }}</p> }
              <h2>{{ section.title }}</h2>
              @if (section.body) { <p>{{ section.body }}</p> }
              @if (section.linkLabel && section.linkUrl) { <a class="button button-dark" [href]="section.linkUrl">{{ section.linkLabel }} <span>↗</span></a> }
            </div>
          </section>
        }
        @case ('quote') {
          @if (section.imageUrl && section.layout !== 'centered') {
            <section class="quote home-quote-image" [class.image-left]="section.layout === 'image-left'">
              <img [src]="section.imageUrl" [alt]="section.signature || 'Ambiance du salon'" loading="lazy">
              <div><span class="quote-mark">“</span><blockquote>{{ section.body }}</blockquote>@if (section.signature) { <p>{{ section.signature }}</p> }</div>
            </section>
          } @else {
            <section class="quote section-wrap">
              <span class="quote-mark">“</span>
              <blockquote>{{ section.body }}</blockquote>
              @if (section.signature) { <p>{{ section.signature }}</p> }
            </section>
          }
        }
      }
    }
  `
})
export class HomeSectionsComponent {
  @Input({ required: true }) sections: HomeSection[] = [];
}
