export const environment = {
  production: false,
  // Relative so requests are same-origin (dev proxy / prod same-domain) — required
  // for the httpOnly session cookie + Angular's XSRF header to be sent automatically.
  apiUrl: '/api/v1',
  storageUrl: '/storage'
};
