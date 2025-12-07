import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function DELETE(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { provider } = await req.json();

        if (!provider) {
            return NextResponse.json({ error: 'Provider is required' }, { status: 400 });
        }

        // Map frontend IDs to database provider names
        let dbProvider = provider;
        if (provider === 'google-calendar') dbProvider = 'google';
        if (provider === 'outlook') {
            // Check both potential names for Outlook
            await prisma.account.deleteMany({
                where: {
                    userId: session.user.id,
                    provider: { in: ['microsoft-entra-id', 'azure-ad'] }
                }
            });
            return NextResponse.json({ success: true });
        }

        await prisma.account.deleteMany({
            where: {
                userId: session.user.id,
                provider: dbProvider
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error disconnecting account:', error);
        return NextResponse.json({ error: 'Failed to disconnect account' }, { status: 500 });
    }
}
