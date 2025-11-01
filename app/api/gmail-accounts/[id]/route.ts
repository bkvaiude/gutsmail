import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH: Toggle active status of a Gmail account
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'isActive must be a boolean' },
        { status: 400 }
      );
    }

    // Verify ownership
    const account = await prisma.gmailAccount.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Gmail account not found' },
        { status: 404 }
      );
    }

    // Update active status
    const updated = await prisma.gmailAccount.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        email: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating Gmail account:', error);
    return NextResponse.json(
      { error: 'Failed to update Gmail account' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a Gmail account connection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const account = await prisma.gmailAccount.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Gmail account not found' },
        { status: 404 }
      );
    }

    // Delete the account
    await prisma.gmailAccount.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Account removed' });
  } catch (error) {
    console.error('Error deleting Gmail account:', error);
    return NextResponse.json(
      { error: 'Failed to delete Gmail account' },
      { status: 500 }
    );
  }
}
