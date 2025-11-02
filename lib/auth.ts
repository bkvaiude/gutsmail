import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';

// Custom adapter to filter out unsupported fields from Google OAuth
const customAdapter = () => {
  const baseAdapter = PrismaAdapter(prisma);
  return {
    ...baseAdapter,
    createUser: async (user: any) => {
      console.log('🔵 [AUTH] Creating user:', { email: user.email, name: user.name });
      const result = await baseAdapter.createUser!(user);
      console.log('✅ [AUTH] User created successfully:', result.id);
      return result;
    },
    getUser: async (id: string) => {
      console.log('🔍 [AUTH] Getting user by ID:', id);
      const user = await baseAdapter.getUser!(id);
      console.log(user ? '✅ [AUTH] User found' : '❌ [AUTH] User not found');
      return user;
    },
    getUserByEmail: async (email: string) => {
      console.log('🔍 [AUTH] Getting user by email:', email);
      const user = await baseAdapter.getUserByEmail!(email);
      console.log(user ? '✅ [AUTH] User found' : '❌ [AUTH] User not found');
      return user;
    },
    getUserByAccount: async (providerAccountId: any) => {
      console.log('🔍 [AUTH] Getting user by account:', { provider: providerAccountId.provider, providerAccountId: providerAccountId.providerAccountId });
      const account = await baseAdapter.getUserByAccount!(providerAccountId);
      console.log(account ? '✅ [AUTH] Account found' : '❌ [AUTH] Account not found');
      return account;
    },
    linkAccount: async (account: any) => {
      console.log('🔗 [AUTH] Linking account:', {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        userId: account.userId,
        hasRefreshTokenExpiry: !!account.refresh_token_expires_in
      });

      // Remove fields not in Prisma schema
      const { refresh_token_expires_in, ...accountData } = account;

      if (refresh_token_expires_in) {
        console.log('⚠️  [AUTH] Removed refresh_token_expires_in field:', refresh_token_expires_in);
      }

      try {
        const result = await baseAdapter.linkAccount!(accountData);
        console.log('✅ [AUTH] Account linked successfully');
        return result;
      } catch (error: any) {
        console.error('❌ [AUTH] Failed to link account:', error.message);
        console.error('📋 [AUTH] Account data attempted:', JSON.stringify(accountData, null, 2));
        throw error;
      }
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
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('🔐 [AUTH] Sign-in callback triggered');
      console.log('👤 [AUTH] User:', { id: user.id, email: user.email, name: user.name });
      console.log('🔑 [AUTH] Account:', { provider: account?.provider, type: account?.type });
      console.log('📝 [AUTH] Profile email:', profile?.email);

      // Auto-create GmailAccount for the user's OAuth email
      if (account?.provider === 'google' && user.email && account.access_token) {
        try {
          const existingGmailAccount = await prisma.gmailAccount.findUnique({
            where: {
              userId_email: {
                userId: user.id,
                email: user.email,
              },
            },
          });

          if (!existingGmailAccount) {
            console.log('📧 [AUTH] Auto-creating GmailAccount for:', user.email);
            await prisma.gmailAccount.create({
              data: {
                userId: user.id,
                email: user.email,
                accessToken: account.access_token,
                refreshToken: account.refresh_token,
                expiresAt: account.expires_at,
                isActive: true,
              },
            });
            console.log('✅ [AUTH] GmailAccount created successfully');
          } else {
            // Update tokens if account already exists
            console.log('🔄 [AUTH] Updating GmailAccount tokens for:', user.email);
            await prisma.gmailAccount.update({
              where: {
                userId_email: {
                  userId: user.id,
                  email: user.email,
                },
              },
              data: {
                accessToken: account.access_token,
                refreshToken: account.refresh_token,
                expiresAt: account.expires_at,
                isActive: true,
              },
            });
            console.log('✅ [AUTH] GmailAccount tokens updated');
          }
        } catch (error: any) {
          console.error('❌ [AUTH] Failed to create/update GmailAccount:', error.message);
        }
      }

      return true;
    },
    async session({ session, user }) {
      console.log('🎫 [AUTH] Session callback - User ID:', user.id);
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
