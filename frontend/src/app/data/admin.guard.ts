import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AdminService } from './admin.service';

export const adminGuard: CanActivateFn = (_route, state) => {
  const admin = inject(AdminService);
  const router = inject(Router);
  return admin.isAuthenticated().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } })))
  );
};
