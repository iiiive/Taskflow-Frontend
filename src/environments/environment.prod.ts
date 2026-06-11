export const environment = {
  production: true,
  // Relative: in production Nginx serves the SPA and reverse-proxies /api + /sanctum
  // + /storage to the backend on the SAME domain, so the session cookie and the
  // XSRF header are sent automatically (same-origin).
  apiUrl: '/api/v1',
  storageUrl: '/storage'
};
