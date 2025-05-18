import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const isLogoutRequest = req.url.includes('/logout');
  const isLoginPage = router.url === '/login';

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isLogoutRequest && !isLoginPage) {
        console.warn('401 Unauthorized response intercepted. Logging out user.');
        authService.logout().subscribe({
          next: () => {
            router.navigate(['/login']);
          },
          error: (logoutError) => {
            console.error('Error during logout after 401:', logoutError);
            authService.removeUser();
            router.navigate(['/login']);
          }
        });

        return throwError(() => error);
      }
      
      return throwError(() => error);
    })
  );
};
