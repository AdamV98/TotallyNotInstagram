import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.getCurrentUser();

  if (currentUser && currentUser.role === 'admin') {
    console.log('Admin guard: Access granted (User is admin).');
    return true;
  } else {
    console.warn('Admin guard: Access denied.');

    if (authService.isLoggedIn()) {
        console.warn('User is logged in but not an admin. Redirecting to feed.');
        router.navigate(['/feed']);
    } else {
        console.warn('User is not logged in. Redirecting to login.');
        router.navigate(['/login']);
    }

    return false;
  }
};
