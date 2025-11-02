import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const priority = searchParams.get('priority'); // 'high', 'medium', 'low'
    const important = searchParams.get('important'); // 'true' or 'false'

    const where: any = {
      isDeleted: false,
      gmailAccount: {
        userId: session.user.id,
      },
    };

    // Category filter
    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId;
    }

    // Priority filter
    if (priority === 'high') {
      where.aiPriorityScore = { gte: 70 };
    } else if (priority === 'medium') {
      where.aiPriorityScore = { gte: 40, lt: 70 };
    } else if (priority === 'low') {
      where.aiPriorityScore = { lt: 40 };
    }

    // Important info filter
    if (important === 'true') {
      where.hasImportantInfo = true;
    }

    const emails = await prisma.email.findMany({
      where,
      orderBy: { date: 'desc' },
      select: {
        id: true,
        messageId: true,
        subject: true,
        from: true,
        fromName: true,
        date: true,
        snippet: true,
        summary: true,
        categoryId: true,
        aiPriorityScore: true,
        hasImportantInfo: true,
        importantInfoFlags: true,
        unsubscribeLink: true,
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      take: 100,
    });

    return NextResponse.json(emails);
  } catch (error) {
    console.error('Error fetching emails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}
