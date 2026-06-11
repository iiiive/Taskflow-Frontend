import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Soft client-side gate: allows navigation when a cached user profile exists.
 * The authoritative check is the httpOnly session cookie — API calls return 401
 * if it's missing/expired, and the unauthorizedInterceptor then redirects here.
 */
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);

  if (localStorage.getItem('planora_user')) {
    return true;
  }

  router.navigate(['/login'], { replaceUrl: true });
  return false;
};
