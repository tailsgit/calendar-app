
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        // Await params properly
        const { id } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { action, responseNote } = body; // action: accept or decline

        if (!['accept', 'decline'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        // 1. Find the participant record for this user and event
        const participant = await prisma.participant.findFirst({
            where: {
                eventId: id,
                userId: session.user.id
            },
            include: { event: true } // Need event info for notification
        });

        if (!participant) {
            return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
        }

        // 2. Update status and note
        const newStatus = action === 'accept' ? 'ACCEPTED' : 'DECLINED';

        await prisma.participant.update({
            where: { id: participant.id },
            data: {
                status: newStatus,
                responseNote: responseNote || null
            }
        });

        // 3. Notify Owner (and generic "Not this week" flow if note provided)
        const isNotThisWeek = action === 'decline' && responseNote;
        const verb = action === 'accept' ? 'accepted' : 'declined';

        await createNotification({
            userId: participant.event.ownerId,
            type: 'update',
            title: `Meeting ${verb.charAt(0).toUpperCase() + verb.slice(1)}`,
            message: `${session.user.name} ${verb} "${participant.event.title}"${isNotThisWeek ? `: "${responseNote}"` : ''}`,
            link: `/`
        });

        // Optionally notify other participants if it's "Not this week" logic as requested
        // "Notify: Sends a “Not this week” notification to all invitees."
        if (isNotThisWeek) {
            const allParticipants = await prisma.participant.findMany({
                where: { eventId: id }
            });
            const currentUser = session.user; // Captured for TS check in map

            await Promise.all(allParticipants.map(async (p) => {
                if (p.userId && p.userId !== currentUser.id && p.userId !== participant.event.ownerId) {
                    await createNotification({
                        userId: p.userId,
                        type: 'update',
                        title: `Declined: Not this week`,
                        message: `${currentUser.name} declined "${participant.event.title}": "${responseNote}"`,
                        link: `/`
                    });
                }
            }));
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error responding to event:', error);
        return NextResponse.json({ error: 'Failed to process response' }, { status: 500 });
    }
}
