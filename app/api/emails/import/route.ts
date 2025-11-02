import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  fetchRecentEmails,
  archiveEmail,
  extractUnsubscribeLink,
  getGmailClientFromAccount,
  fetchRecentEmailsFromClient,
  archiveEmailWithClient,
} from '@/lib/gmail';
import {
  analyzeEmailComplete,
} from '@/lib/gemini';

// Utility function to sleep for a given duration
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Exponential backoff retry wrapper for API calls
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const is429 = error?.message?.includes('429') || error?.message?.includes('Resource exhausted');
      const isLastAttempt = attempt === maxRetries - 1;

      if (!is429 || isLastAttempt) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const delay = baseDelay * Math.pow(2, attempt);
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 1000;
      const totalDelay = delay + jitter;

      console.log(`Rate limited (429). Retrying in ${Math.round(totalDelay / 1000)}s... (attempt ${attempt + 1}/${maxRetries})`);
      await sleep(totalDelay);
    }
  }

  throw new Error('Max retries exceeded');
}

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

    // Fetch all active Gmail accounts
    const gmailAccounts = await prisma.gmailAccount.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
    });

    // Fetch emails from all active Gmail accounts
    let allGmailMessages: Array<{ message: any; accountId: string; gmailClient: any }> = [];

    if (gmailAccounts.length > 0) {
      console.log(`📬 Fetching emails from ${gmailAccounts.length} active Gmail account(s)...`);

      for (const account of gmailAccounts) {
        try {
          console.log(`   📧 Fetching from ${account.email}...`);
          const gmailClient = await getGmailClientFromAccount(account);
          const messages = await fetchRecentEmailsFromClient(gmailClient, maxEmails);

          // Add accountId and gmailClient to each message for later use
          for (const message of messages) {
            allGmailMessages.push({
              message,
              accountId: account.id,
              gmailClient,
            });
          }

          console.log(`   ✓ Found ${messages.length} emails from ${account.email}`);
        } catch (error) {
          console.error(`   ✗ Error fetching from ${account.email}:`, error);
        }
      }
    } else {
      // Fallback to main OAuth account if no GmailAccounts configured
      console.log('📬 No Gmail accounts configured, using main OAuth account...');
      const messages = await fetchRecentEmails(session.user.id, maxEmails);

      // For backward compatibility, no accountId for these
      for (const message of messages) {
        allGmailMessages.push({
          message,
          accountId: '',
          gmailClient: null,
        });
      }
    }

    console.log(`📧 Total emails fetched: ${allGmailMessages.length}`);

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Filter out emails that already exist
    const newEmails = [];
    for (const item of allGmailMessages) {
      const existing = await prisma.email.findUnique({
        where: { messageId: item.message.id },
      });

      if (existing) {
        skipped++;
      } else {
        newEmails.push(item);
      }
    }

    console.log(`📧 Processing ${newEmails.length} new emails (${skipped} already exist)`);

    // Process emails in batches to respect rate limits
    // Free tier: 5 requests per minute
    // Strategy: 4 emails per batch, 60s delay between batches
    const BATCH_SIZE = 4;
    const BATCH_DELAY_MS = 60000; // 60 seconds

    for (let i = 0; i < newEmails.length; i += BATCH_SIZE) {
      const batch = newEmails.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(newEmails.length / BATCH_SIZE);

      console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} emails)`);

      // Process all emails in this batch in parallel
      const batchPromises = batch.map(async (item) => {
        const gmailMsg = item.message;
        const gmailAccountId = item.accountId || null;
        const gmailClient = item.gmailClient;

        try {
          // Use combined AI analysis with retry logic
          const analysis = await retryWithBackoff(() =>
            analyzeEmailComplete(
              {
                subject: gmailMsg.subject,
                from: gmailMsg.from,
                fromName: gmailMsg.fromName,
                snippet: gmailMsg.snippet,
                body: gmailMsg.body,
              },
              categories
            )
          );

          // Extract unsubscribe link (no API call)
          const unsubscribeLink = await extractUnsubscribeLink(
            gmailMsg.body,
            gmailMsg.htmlBody
          );

          // Save email to database (skip if already exists)
          const existingEmail = await prisma.email.findUnique({
            where: { messageId: gmailMsg.id },
          });

          if (!existingEmail) {
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
                summary: analysis.summary,
                unsubscribeLink,
                categoryId: analysis.categoryId,
                gmailAccountId: gmailAccountId,
                aiPriorityScore: analysis.priorityScore,
                hasImportantInfo: analysis.importantInfo.hasImportant,
                importantInfoFlags: analysis.importantInfo.flags.length > 0
                  ? JSON.stringify(analysis.importantInfo.flags)
                  : null,
              },
            });
          } else {
            console.log(`⏭️  Skipping duplicate email: ${gmailMsg.subject}`);
            return { success: true, skipped: true };
          }

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

          // Archive email in Gmail (configurable via env)
          if (process.env.AUTO_ARCHIVE_EMAILS === 'true') {
            try {
              if (gmailClient) {
                // Use client-based archive for multi-account support
                await archiveEmailWithClient(gmailClient, gmailMsg.id);
              } else {
                // Fallback to userId-based archive for backward compatibility
                await archiveEmail(session.user.id, gmailMsg.id);
              }
            } catch (archiveError) {
              console.error('Error archiving email:', archiveError);
              // Don't fail the import if archiving fails
            }
          }

          console.log(`  ✅ ${gmailMsg.subject.slice(0, 50)}...`);
          return { success: true };
        } catch (error) {
          console.error(`  ❌ Error processing "${gmailMsg.subject}":`, error);
          errors.push(`Failed to process email: ${gmailMsg.subject}`);
          return { success: false, error };
        }
      });

      // Wait for all emails in this batch to complete
      const results = await Promise.all(batchPromises);
      const successCount = results.filter(r => r.success && !(r as any).skipped).length;
      const skippedCount = results.filter(r => r.success && (r as any).skipped).length;
      imported += successCount;
      skipped += skippedCount;

      console.log(`✨ Batch ${batchNum} complete: ${successCount}/${batch.length} successful, ${skippedCount} skipped`);

      // Add delay before next batch (unless this is the last batch)
      const hasMoreBatches = i + BATCH_SIZE < newEmails.length;
      if (hasMoreBatches) {
        console.log(`⏳ Waiting 60 seconds before next batch to respect rate limits...`);
        await sleep(BATCH_DELAY_MS);
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

    // Calculate and log statistics
    if (imported > 0) {
      const importedEmails = await prisma.email.findMany({
        where: {
          category: {
            userId: session.user.id,
          },
          isDeleted: false,
        },
        select: {
          aiPriorityScore: true,
          hasImportantInfo: true,
          categoryId: true,
        },
      });

      const uncategorized = await prisma.email.findMany({
        where: {
          categoryId: null,
          isDeleted: false,
        },
        select: {
          aiPriorityScore: true,
          hasImportantInfo: true,
          categoryId: true,
        },
      });

      const allEmails = [...importedEmails, ...uncategorized];

      const high = allEmails.filter(e => (e.aiPriorityScore || 50) >= 70).length;
      const medium = allEmails.filter(e => {
        const score = e.aiPriorityScore || 50;
        return score >= 40 && score < 70;
      }).length;
      const low = allEmails.filter(e => (e.aiPriorityScore || 50) < 40).length;
      const important = allEmails.filter(e => e.hasImportantInfo).length;

      console.log('\n📊 Email Import Statistics:');
      console.log(`   Total Emails: ${allEmails.length}`);
      console.log(`   🔴 High Priority: ${high}`);
      console.log(`   🟡 Medium Priority: ${medium}`);
      console.log(`   🟢 Low Priority: ${low}`);
      console.log(`   ⭐ Important Info: ${important}`);
      console.log('');
    }

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
