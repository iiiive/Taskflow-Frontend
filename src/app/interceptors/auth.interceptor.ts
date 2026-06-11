import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Sends the httpOnly session cookie + XSRF token with every request.
 * (Auth is now cookie-based — no bearer token is read from localStorage.)
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  return next(
    req.clone({
      withCredentials: true,
      setHeaders: { Accept: 'application/json' }
    })
  );
};
