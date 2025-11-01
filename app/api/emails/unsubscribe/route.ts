import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Fetch emails with unsubscribe links
    const emails = await prisma.email.findMany({
      where: {
        id: { in: emailIds },
        unsubscribeLink: { not: null },
      },
      select: {
        id: true,
        unsubscribeLink: true,
        from: true,
        subject: true,
      },
    });

    const unsubscribeLinks = emails
      .filter((e) => e.unsubscribeLink)
      .map((e) => ({
        emailId: e.id,
        from: e.from,
        link: e.unsubscribeLink!,
      }));

    return NextResponse.json({
      success: true,
      count: unsubscribeLinks.length,
      links: unsubscribeLinks,
    });
  } catch (error) {
    console.error('Error processing unsubscribe:', error);
    return NextResponse.json(
      { error: 'Failed to process unsubscribe request' },
      { status: 500 }
    );
  }
}
