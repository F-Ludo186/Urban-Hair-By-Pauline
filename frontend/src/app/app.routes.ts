import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component';
import { ShopComponent } from './pages/shop.component';
import { GalleryComponent } from './pages/gallery.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Accueil — Urban Hair by Pauline' },
  { path: 'boutique', component: ShopComponent, title: 'Boutique — Urban Hair by Pauline' },
  { path: 'galerie', component: GalleryComponent, title: 'Galerie — Urban Hair by Pauline' },
  { path: '**', redirectTo: '' }
];
