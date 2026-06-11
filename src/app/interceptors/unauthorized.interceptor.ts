import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * When the session is missing/expired the API replies 401 (or 419 for a stale
 * CSRF token). Clear the cached user profile and bounce to /login.
 */
export const unauthorizedInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error) => {
      if (error?.status === 401 || error?.status === 419) {
        localStorage.removeItem('planora_user');
        localStorage.removeItem('planora_token');
        localStorage.removeItem('token');

        const onAuthPage = /\/(login|register|forgot-password|reset-password)/.test(router.url);
        if (!onAuthPage) {
          router.navigate(['/login'], { replaceUrl: true });
        }
      }
      return throwError(() => error);
    })
  );
};
