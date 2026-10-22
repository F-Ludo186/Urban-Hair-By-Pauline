import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component';
import { ShopComponent } from './pages/shop.component';
import { GalleryComponent } from './pages/gallery.component';
import { AdminComponent } from './pages/admin.component';
import { AdminLoginComponent } from './pages/admin-login.component';
import { adminGuard } from './data/admin.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Accueil — Urban Hair by Pauline' },
  { path: 'boutique', component: ShopComponent, title: 'Boutique — Urban Hair by Pauline' },
  { path: 'galerie', component: GalleryComponent, title: 'Galerie — Urban Hair by Pauline' },
  { path: 'admin/login', component: AdminLoginComponent, title: 'Connexion — Administration' },
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard], title: 'Administration — Urban Hair by Pauline' },
  { path: '**', redirectTo: '' }
];
