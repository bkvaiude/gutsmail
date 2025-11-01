import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiUnsubscribe } from '@/lib/unsubscribe-agent';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    console.log(`🤖 Starting AI unsubscribe agent for: ${url}`);

    // Run the AI unsubscribe agent
    const result = await aiUnsubscribe(url);

    console.log(`🤖 AI unsubscribe ${result.success ? 'succeeded' : 'failed'}: ${result.message}`);
    console.log(`   Actions taken: ${result.actions?.join(' → ')}`);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error running unsubscribe agent:', error);
    return NextResponse.json(
      {
        error: 'Failed to run unsubscribe agent',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
