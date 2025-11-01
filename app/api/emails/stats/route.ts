import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all user's emails that aren't deleted
    const emails = await prisma.email.findMany({
      where: {
        category: {
          userId: session.user.id,
        },
        isDeleted: false,
      },
      select: {
        id: true,
        aiPriorityScore: true,
        hasImportantInfo: true,
        categoryId: true,
      },
    });

    // Also get emails with no category
    const uncategorizedEmails = await prisma.email.findMany({
      where: {
        categoryId: null,
        isDeleted: false,
      },
      select: {
        id: true,
        aiPriorityScore: true,
        hasImportantInfo: true,
        categoryId: true,
      },
    });

    const allEmails = [...emails, ...uncategorizedEmails];

    // Calculate overall statistics
    const total = allEmails.length;
    const high = allEmails.filter(e => (e.aiPriorityScore || 50) >= 70).length;
    const medium = allEmails.filter(e => {
      const score = e.aiPriorityScore || 50;
      return score >= 40 && score < 70;
    }).length;
    const low = allEmails.filter(e => (e.aiPriorityScore || 50) < 40).length;
    const importantInfo = allEmails.filter(e => e.hasImportantInfo).length;

    // Calculate per-category statistics
    const categories = await prisma.category.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true },
    });

    const byCategory: Record<string, {
      name: string;
      high: number;
      medium: number;
      low: number;
      important: number;
      total: number;
    }> = {};

    // Initialize all categories
    categories.forEach(cat => {
      byCategory[cat.id] = {
        name: cat.name,
        high: 0,
        medium: 0,
        low: 0,
        important: 0,
        total: 0,
      };
    });

    // Add uncategorized
    byCategory['uncategorized'] = {
      name: 'Uncategorized',
      high: 0,
      medium: 0,
      low: 0,
      important: 0,
      total: 0,
    };

    // Count emails per category
    allEmails.forEach(email => {
      const catId = email.categoryId || 'uncategorized';
      if (!byCategory[catId]) return;

      const score = email.aiPriorityScore || 50;
      byCategory[catId].total++;

      if (score >= 70) byCategory[catId].high++;
      else if (score >= 40) byCategory[catId].medium++;
      else byCategory[catId].low++;

      if (email.hasImportantInfo) byCategory[catId].important++;
    });

    // Remove empty uncategorized if no emails
    if (byCategory['uncategorized'].total === 0) {
      delete byCategory['uncategorized'];
    }

    return NextResponse.json({
      total,
      priorities: {
        high,
        medium,
        low,
      },
      importantInfo,
      byCategory,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
