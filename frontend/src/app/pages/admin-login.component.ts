import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminService } from '../data/admin.service';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <main class="admin-login-page">
      <a class="brand" routerLink="/">URBAN HAIR<span>by Pauline</span></a>
      <section class="admin-login-card">
        <p class="eyebrow">ESPACE PRIVÉ</p>
        <h1>Bienvenue.</h1>
        <p>Connectez-vous pour gérer les photos et les textes de votre galerie.</p>
        <form (ngSubmit)="submit()">
          <label for="admin-username">Identifiant</label>
          <input id="admin-username" name="username" [(ngModel)]="username" autocomplete="username" required>
          <label for="admin-password">Mot de passe</label>
          <input id="admin-password" name="password" [(ngModel)]="password" type="password" autocomplete="current-password" required>
          @if (errorMessage) { <p class="admin-error" role="alert">{{ errorMessage }}</p> }
          <button class="button button-dark" type="submit" [disabled]="busy">
            {{ busy ? 'Connexion...' : 'Me connecter' }}
          </button>
        </form>
        <a class="admin-back-link" routerLink="/">Retour au site</a>
      </section>
    </main>
  `
})
export class AdminLoginComponent {
  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);

  username = '';
  password = '';
  errorMessage = '';
  busy = false;

  submit(): void {
    if (this.busy) return;
    this.busy = true;
    this.errorMessage = '';
    this.admin.login(this.username.trim(), this.password).subscribe({
      next: () => this.router.navigateByUrl('/admin'),
      error: (error: { status?: number }) => {
        this.errorMessage = error.status === 401
          ? 'Identifiant ou mot de passe incorrect.'
          : 'Connexion impossible. Vérifiez que le serveur est démarré, puis réessayez.';
        this.busy = false;
      }
    });
  }
}
