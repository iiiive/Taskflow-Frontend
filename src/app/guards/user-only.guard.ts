import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const userOnlyGuard: CanActivateFn = () => {
  const router = inject(Router);

  try {
    const user = JSON.parse(localStorage.getItem('planora_user') || 'null');
    if (user?.is_super_admin) {
      router.navigate(['/admin'], { replaceUrl: true });
      return false;
    }
    if (user?.is_org_admin) {
      router.navigate(['/org'], { replaceUrl: true });
      return false;
    }
  } catch {}

  return true;
};
