import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-compatible auth config — NO Node.js dependencies (no bcrypt, no pg, no drizzle).
 * Used by middleware. The full config in auth.ts spreads this and adds providers + adapter.
 */
export const authConfig = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  providers: [], // added in auth.ts
} satisfies NextAuthConfig;
