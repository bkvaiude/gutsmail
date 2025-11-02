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

    // Get today's insights
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayInsight = await prisma.emailInsight.findUnique({
      where: {
        userId_date: {
          userId: session.user.id,
          date: today,
        },
      },
    });

    // Get last 7 days insights
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weekInsights = await prisma.emailInsight.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: { date: 'desc' },
    });

    // Calculate weekly totals
    const weeklyTotals = weekInsights.reduce(
      (acc, insight) => ({
        emailsProcessed: acc.emailsProcessed + insight.emailsProcessed,
        emailsArchived: acc.emailsArchived + insight.emailsArchived,
        emailsDeleted: acc.emailsDeleted + insight.emailsDeleted,
        timeSavedMins: acc.timeSavedMins + insight.timeSavedMins,
      }),
      { emailsProcessed: 0, emailsArchived: 0, emailsDeleted: 0, timeSavedMins: 0 }
    );

    // Get top senders
    const topSenders = await prisma.senderProfile.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: { totalEmails: 'desc' },
      take: 10,
    });

    // Get email stats (only user's emails)
    const totalEmails = await prisma.email.count({
      where: {
        isDeleted: false,
        gmailAccount: {
          userId: session.user.id,
        },
      },
    });

    const highPriorityCount = await prisma.email.count({
      where: {
        isDeleted: false,
        aiPriorityScore: { gte: 70 },
        gmailAccount: {
          userId: session.user.id,
        },
      },
    });

    const importantInfoCount = await prisma.email.count({
      where: {
        isDeleted: false,
        hasImportantInfo: true,
        gmailAccount: {
          userId: session.user.id,
        },
      },
    });

    return NextResponse.json({
      today: todayInsight,
      weekly: weeklyTotals,
      topSenders,
      stats: {
        totalEmails,
        highPriorityCount,
        importantInfoCount,
        inboxHealthScore: todayInsight?.inboxHealthScore || 50,
      },
    });
  } catch (error) {
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}
