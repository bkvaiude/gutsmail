import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  fetchRecentEmails,
  archiveEmail,
  extractUnsubscribeLink,
} from '@/lib/gmail';
import {
  categorizeEmail,
  summarizeEmail,
  calculatePriorityScore,
  detectImportantInfo,
} from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { maxEmails = 20 } = body;

    // Fetch categories
    const categories = await prisma.category.findMany({
      where: { userId: session.user.id },
    });

    // Fetch emails from Gmail
    const gmailMessages = await fetchRecentEmails(session.user.id, maxEmails);

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const gmailMsg of gmailMessages) {
      try {
        // Check if email already exists
        const existing = await prisma.email.findUnique({
          where: { messageId: gmailMsg.id },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Categorize email
        const categoryId = await categorizeEmail(
          {
            subject: gmailMsg.subject,
            from: gmailMsg.from,
            fromName: gmailMsg.fromName,
            snippet: gmailMsg.snippet,
            body: gmailMsg.body,
          },
          categories
        );

        // Generate summary
        const summary = await summarizeEmail(gmailMsg.body, gmailMsg.subject);

        // Calculate priority score
        const priorityScore = await calculatePriorityScore({
          subject: gmailMsg.subject,
          from: gmailMsg.from,
          fromName: gmailMsg.fromName,
          snippet: gmailMsg.snippet,
          body: gmailMsg.body,
        });

        // Detect important information
        const { hasImportant, flags } = await detectImportantInfo(gmailMsg.body);

        // Extract unsubscribe link
        const unsubscribeLink = await extractUnsubscribeLink(
          gmailMsg.body,
          gmailMsg.htmlBody
        );

        // Save email to database
        await prisma.email.create({
          data: {
            messageId: gmailMsg.id,
            threadId: gmailMsg.threadId,
            subject: gmailMsg.subject,
            from: gmailMsg.from,
            fromName: gmailMsg.fromName,
            to: gmailMsg.to,
            date: gmailMsg.date,
            snippet: gmailMsg.snippet,
            body: gmailMsg.body,
            htmlBody: gmailMsg.htmlBody,
            summary,
            unsubscribeLink,
            categoryId,
            aiPriorityScore: priorityScore,
            hasImportantInfo: hasImportant,
            importantInfoFlags: flags.length > 0 ? JSON.stringify(flags) : null,
          },
        });

        // Update or create sender profile
        await prisma.senderProfile.upsert({
          where: {
            userId_email: {
              userId: session.user.id,
              email: gmailMsg.from,
            },
          },
          create: {
            userId: session.user.id,
            email: gmailMsg.from,
            name: gmailMsg.fromName,
            totalEmails: 1,
            lastEmailDate: gmailMsg.date,
          },
          update: {
            totalEmails: { increment: 1 },
            lastEmailDate: gmailMsg.date,
            name: gmailMsg.fromName,
          },
        });

        // Archive email in Gmail
        try {
          await archiveEmail(session.user.id, gmailMsg.id);
        } catch (archiveError) {
          console.error('Error archiving email:', archiveError);
          // Don't fail the import if archiving fails
        }

        imported++;
      } catch (error) {
        console.error('Error processing email:', error);
        errors.push(`Failed to process email: ${gmailMsg.subject}`);
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
        emailsProcessed: imported,
        emailsArchived: imported,
        timeSavedMins: Math.floor(imported * 2), // Estimate 2 mins per email
      },
      update: {
        emailsProcessed: { increment: imported },
        emailsArchived: { increment: imported },
        timeSavedMins: { increment: Math.floor(imported * 2) },
      },
    });

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors,
    });
  } catch (error) {
    console.error('Error importing emails:', error);
    return NextResponse.json(
      { error: 'Failed to import emails', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
