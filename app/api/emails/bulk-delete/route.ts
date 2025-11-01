import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteEmail } from '@/lib/gmail';

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
        messageId: true,
      },
    });

    let deleted = 0;
    const errors: string[] = [];

    for (const email of emails) {
      try {
        // Delete from Gmail
        await deleteEmail(session.user.id, email.messageId);

        // Mark as deleted in database
        await prisma.email.update({
          where: { id: email.id },
          data: { isDeleted: true },
        });

        deleted++;
      } catch (error) {
        console.error(`Error deleting email ${email.id}:`, error);
        errors.push(email.id);
      }
    }

    // Update daily insights
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.emailInsight.upsert({
      where: {
        userId_date: {
          userId: session.user.id,
          date: today,
        },
      },
      create: {
        userId: session.user.id,
        date: today,
        emailsDeleted: deleted,
        timeSavedMins: Math.floor(deleted * 1), // Estimate 1 min per email deleted
      },
      update: {
        emailsDeleted: { increment: deleted },
        timeSavedMins: { increment: Math.floor(deleted * 1) },
      },
    });

    return NextResponse.json({
      success: true,
      deleted,
      failed: errors.length,
      errors,
    });
  } catch (error) {
    console.error('Error bulk deleting emails:', error);
    return NextResponse.json(
      { error: 'Failed to delete emails' },
      { status: 500 }
    );
  }
}
