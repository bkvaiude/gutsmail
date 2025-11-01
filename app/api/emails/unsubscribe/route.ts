import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { aiUnsubscribe } from '@/lib/unsubscribe-agent';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { emailIds, useAI = false } = body;

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
        subject: e.subject,
      }));

    // If useAI is false, just return the links (old behavior)
    if (!useAI) {
      return NextResponse.json({
        success: true,
        count: unsubscribeLinks.length,
        links: unsubscribeLinks,
      });
    }

    // Use AI agent to unsubscribe
    console.log(`🤖 Starting AI unsubscribe for ${unsubscribeLinks.length} emails`);

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const item of unsubscribeLinks) {
      console.log(`\n🔗 Processing unsubscribe for: ${item.from}`);
      console.log(`   Link: ${item.link}`);

      try {
        const result = await aiUnsubscribe(item.link);

        results.push({
          emailId: item.emailId,
          from: item.from,
          subject: item.subject,
          link: item.link,
          ...result,
        });

        if (result.success) {
          successCount++;
          console.log(`   ✅ Success: ${result.message}`);
        } else {
          failCount++;
          console.log(`   ❌ Failed: ${result.message}`);
        }

        // Small delay between requests to be respectful
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`   ❌ Error:`, error);
        failCount++;
        results.push({
          emailId: item.emailId,
          from: item.from,
          subject: item.subject,
          link: item.link,
          success: false,
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    console.log(`\n📊 AI Unsubscribe Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📧 Total: ${unsubscribeLinks.length}`);

    return NextResponse.json({
      success: true,
      count: unsubscribeLinks.length,
      successCount,
      failCount,
      results,
    });
  } catch (error) {
    console.error('Error processing unsubscribe:', error);
    return NextResponse.json(
      { error: 'Failed to process unsubscribe request' },
      { status: 500 }
    );
  }
}
