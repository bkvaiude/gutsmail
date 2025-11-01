import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { analyzeBulkDeleteSafety } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { emailIds } = body;

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json({ error: 'Email IDs required' }, { status: 400 });
    }

    // Fetch emails
    const emails = await prisma.email.findMany({
      where: {
        id: { in: emailIds },
      },
      select: {
        id: true,
        subject: true,
        from: true,
        snippet: true,
        body: true,
      },
    });

    if (emails.length === 0) {
      return NextResponse.json({ error: 'No emails found' }, { status: 404 });
    }

    // Analyze safety
    const analysis = await analyzeBulkDeleteSafety(emails);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error analyzing emails:', error);
    return NextResponse.json(
      { error: 'Failed to analyze emails' },
      { status: 500 }
    );
  }
}
