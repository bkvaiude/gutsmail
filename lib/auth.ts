import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';

// Custom adapter to filter out unsupported fields from Google OAuth
const customAdapter = () => {
  const baseAdapter = PrismaAdapter(prisma);
  return {
    ...baseAdapter,
    linkAccount: async (account: any) => {
      // Remove fields not in Prisma schema
      const { refresh_token_expires_in, ...accountData } = account;
      return baseAdapter.linkAccount!(accountData);
    },
  };
};

export const authOptions: NextAuthOptions = {
  adapter: customAdapter() as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'database',
  },
};
