import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: List all connected Gmail accounts for the user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const gmailAccounts = await prisma.gmailAccount.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(gmailAccounts);
  } catch (error) {
    console.error('Error fetching Gmail accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Gmail accounts' },
      { status: 500 }
    );
  }
}

// POST: Add a new Gmail account connection
// Note: This endpoint stores the account info from the existing OAuth session
// The actual OAuth flow happens through NextAuth
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current account details from session
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'google',
      },
    });

    if (!account || !account.access_token) {
      return NextResponse.json(
        { error: 'No Google account connected' },
        { status: 400 }
      );
    }

    // Check if this account already exists
    const existing = await prisma.gmailAccount.findFirst({
      where: {
        userId: session.user.id,
        email: session.user.email || '',
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'This Gmail account is already connected' },
        { status: 409 }
      );
    }

    // Create new Gmail account record
    const gmailAccount = await prisma.gmailAccount.create({
      data: {
        userId: session.user.id,
        email: session.user.email || '',
        accessToken: account.access_token,
        refreshToken: account.refresh_token,
        expiresAt: account.expires_at,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(gmailAccount, { status: 201 });
  } catch (error) {
    console.error('Error adding Gmail account:', error);
    return NextResponse.json(
      { error: 'Failed to add Gmail account' },
      { status: 500 }
    );
  }
}
