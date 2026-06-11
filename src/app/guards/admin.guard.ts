import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const userJson = localStorage.getItem('planora_user');

  if (!userJson) {
    router.navigate(['/login']);
    return false;
  }

  try {
    const user = JSON.parse(userJson);
    if (user?.is_super_admin) return true;
    // Org admins belong in their own console, not the platform admin.
    if (user?.is_org_admin) {
      router.navigate(['/org'], { replaceUrl: true });
      return false;
    }
  } catch {}

  router.navigate(['/dashboard']);
  return false;
};
