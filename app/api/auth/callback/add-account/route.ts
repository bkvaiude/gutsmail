import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/auth/signin?error=unauthorized`);
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('❌ [ADD-ACCOUNT] OAuth error:', error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=oauth_failed`);
  }

  if (!code || !state) {
    console.error('❌ [ADD-ACCOUNT] Missing code or state');
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=missing_params`);
  }

  // Verify state parameter
  if (!state.startsWith(`add-account-${session.user.id}-`)) {
    console.error('❌ [ADD-ACCOUNT] Invalid state parameter');
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=invalid_state`);
  }

  try {
    // Exchange authorization code for tokens
    console.log('🔄 [ADD-ACCOUNT] Exchanging code for tokens');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/add-account`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('❌ [ADD-ACCOUNT] Token exchange failed:', errorData);
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();
    console.log('✅ [ADD-ACCOUNT] Tokens received');

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('❌ [ADD-ACCOUNT] Failed to fetch user info');
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=userinfo_failed`);
    }

    const userInfo = await userInfoResponse.json();
    const email = userInfo.email;

    console.log('📧 [ADD-ACCOUNT] Adding account:', email);

    // Check if this account is already connected
    const existingAccount = await prisma.gmailAccount.findUnique({
      where: {
        userId_email: {
          userId: session.user.id,
          email: email,
        },
      },
    });

    if (existingAccount) {
      // Update existing account with new tokens
      console.log('🔄 [ADD-ACCOUNT] Updating existing account');
      await prisma.gmailAccount.update({
        where: {
          userId_email: {
            userId: session.user.id,
            email: email,
          },
        },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || existingAccount.refreshToken,
          expiresAt: tokens.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : existingAccount.expiresAt,
          isActive: true,
        },
      });
      console.log('✅ [ADD-ACCOUNT] Account updated');
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?success=account_updated&email=${encodeURIComponent(email)}`);
    } else {
      // Create new Gmail account
      console.log('➕ [ADD-ACCOUNT] Creating new account');
      await prisma.gmailAccount.create({
        data: {
          userId: session.user.id,
          email: email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : null,
          isActive: true,
        },
      });
      console.log('✅ [ADD-ACCOUNT] New account created');
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?success=account_added&email=${encodeURIComponent(email)}`);
    }
  } catch (error: any) {
    console.error('❌ [ADD-ACCOUNT] Error:', error.message);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=server_error`);
  }
}
