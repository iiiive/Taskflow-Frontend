import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Allows only organization admins onto /org. Super admins go to /admin,
 * everyone else to /dashboard.
 */
export const orgAdminGuard: CanActivateFn = () => {
  const router = inject(Router);

  try {
    const user = JSON.parse(localStorage.getItem('planora_user') || 'null');

    if (user?.is_org_admin) {
      return true;
    }

    if (user?.is_super_admin) {
      router.navigate(['/admin'], { replaceUrl: true });
      return false;
    }
  } catch {}

  router.navigate(['/dashboard'], { replaceUrl: true });
  return false;
};
