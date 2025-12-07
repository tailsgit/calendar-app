
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        const { id } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { startTime, endTime, note } = body;

        // Verify user is a participant
        const participant = await prisma.participant.findFirst({
            where: { eventId: id, userId: session.user.id }
        });

        if (!participant) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Create Proposal
        const proposal = await prisma.rescheduleProposal.create({
            data: {
                eventId: id,
                proposerId: session.user.id,
                startTime: startTime ? new Date(startTime) : null,
                endTime: endTime ? new Date(endTime) : null,
                note,
                status: 'PENDING'
            },
            include: { event: true }
        });

        // Notify All Participants
        const allParticipants = await prisma.participant.findMany({
            where: { eventId: id },
            include: { user: true }
        });

        const currentUser = session.user;
        const recipients = new Set([...allParticipants.map(p => p.userId), proposal.event.ownerId]);

        await Promise.all(Array.from(recipients).map(async (userId) => {
            if (!userId || userId === currentUser.id) return;

            await createNotification({
                userId,
                type: 'update',
                message: `${currentUser.name} proposed a new time for "${proposal.event.title}"`,
                title: 'Reschedule Proposed',
                link: `/`
            });
        }));

        return NextResponse.json({ success: true, proposal });

    } catch (error) {
        console.error('Error proposing reschedule:', error);
        return NextResponse.json({ error: 'Failed to propose reschedule' }, { status: 500 });
    }
}
