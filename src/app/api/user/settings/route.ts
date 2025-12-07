import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function PUT(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { lunchEnabled, lunchStart, lunchEnd, timeZone } = body;

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                ...(lunchEnabled !== undefined && { lunchEnabled }),
                ...(lunchStart && { lunchStart }),
                ...(lunchEnd && { lunchEnd }),
                ...(timeZone && { timeZone }),
            },
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
