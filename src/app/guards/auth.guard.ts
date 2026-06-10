import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);

  const token = localStorage.getItem('planora_token');

  if (token) {
    return true;
  }

  router.navigate(['/login'], { replaceUrl: true });
  return false;
};