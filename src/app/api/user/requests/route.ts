
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // 1. Fetch direct Meeting Requests (where user is recipient)
        const meetingRequests = await prisma.meetingRequest.findMany({
            where: {
                recipientId: userId,
                status: 'PENDING'
            },
            include: {
                requester: { select: { name: true, image: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // 2. Fetch Event Invites (where user is participant)
        const eventInvites = await prisma.participant.findMany({
            where: {
                userId: userId,
                status: 'PENDING'
            },
            include: {
                event: {
                    include: {
                        owner: { select: { name: true, image: true, email: true } }
                    }
                }
            },
            orderBy: { id: 'desc' } // Proxy for created time
        });

        // 3. Normalize data
        const normalizedRequests = [
            ...meetingRequests.map(req => ({
                id: req.id,
                type: 'direct_request',
                title: req.title,
                requester: req.requester,
                startTime: req.startTime,
                endTime: req.endTime,
                duration: req.duration,
                locationType: req.locationType,
                message: req.message,
                createdAt: req.createdAt
            })),
            ...eventInvites.map(invite => ({
                id: invite.id, // Participant ID
                eventId: invite.event.id,
                type: 'event_invite',
                title: invite.event.title,
                requester: invite.event.owner,
                startTime: invite.event.startTime,
                endTime: invite.event.endTime,
                duration: (new Date(invite.event.endTime).getTime() - new Date(invite.event.startTime).getTime()) / 60000,
                locationType: invite.event.locationType || 'VIDEO',
                message: invite.event.description,
                createdAt: invite.event.createdAt
            }))
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json({ requests: normalizedRequests });

    } catch (error) {
        console.error('Error fetching requests:', error);
        return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }
}
