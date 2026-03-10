import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /login, /signup (auth pages)
     * - /api/auth (Auth.js routes)
     * - /_next/static, /_next/image (Next.js internals)
     * - /favicon.ico, /public assets
     */
    '/((?!login|signup|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
