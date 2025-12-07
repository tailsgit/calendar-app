import { NextRequest, NextResponse } from 'next/server';
import { sendBookingConfirmation, sendDeclineNotification } from '@/lib/email';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

// PUT - Accept or Decline request
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { action } = body; // 'accept' | 'decline'

        if (!['accept', 'decline'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        const meetingRequest = await prisma.meetingRequest.findUnique({
            where: { id },
            include: { requester: true, recipient: true },
        });

        if (!meetingRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        if (meetingRequest.recipientId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        if (action === 'accept') {
            // 1. Update request status
            await prisma.meetingRequest.update({
                where: { id },
                data: { status: 'ACCEPTED' },
            });

            // 2. Create Event for Recipient (Owner)
            const event = await prisma.event.create({
                data: {
                    title: meetingRequest.title,
                    description: meetingRequest.message,
                    startTime: meetingRequest.startTime,
                    endTime: meetingRequest.endTime,
                    location: meetingRequest.locationDetails,
                    locationType: meetingRequest.locationType,
                    ownerId: meetingRequest.recipientId,
                    status: 'SCHEDULED',
                    participants: {
                        create: {
                            email: meetingRequest.requester.email!,
                            name: meetingRequest.requester.name,
                            userId: meetingRequest.requesterId,
                            status: 'ACCEPTED',
                        },
                    },
                },
            });

            // 3. Notify Requester (In-App)
            await createNotification({
                userId: meetingRequest.requesterId,
                type: 'update',
                title: '✅ Meeting Accepted',
                message: `${session.user.name} accepted "${meetingRequest.title}"`,
                link: `/`,
            });

            // 4. Send Confirmation Emails (to both)
            if (meetingRequest.requester.email && session.user.email) {
                await sendBookingConfirmation({
                    hostEmail: session.user.email,
                    hostName: session.user.name!,
                    guestEmail: meetingRequest.requester.email,
                    guestName: meetingRequest.requester.name || 'Guest',
                    meetingTitle: meetingRequest.title,
                    date: new Date(meetingRequest.startTime).toLocaleDateString(),
                    time: new Date(meetingRequest.startTime).toLocaleTimeString(),
                    duration: meetingRequest.duration,
                    locationType: meetingRequest.locationType,
                });
            }

            return NextResponse.json({ success: true, event });
        } else {
            // Decline
            await prisma.meetingRequest.update({
                where: { id },
                data: { status: 'DECLINED' },
            });

            // Notify Requester (In-App)
            await createNotification({
                userId: meetingRequest.requesterId,
                type: 'cancelled',
                title: '❌ Meeting Declined',
                message: `${session.user.name} declined "${meetingRequest.title}"`,
                link: `/`,
            });

            // Send Decline Email
            if (meetingRequest.requester.email && session.user.email) {
                await sendDeclineNotification({
                    senderEmail: session.user.email,
                    senderName: session.user.name!,
                    recipientEmail: meetingRequest.requester.email,
                    recipientName: meetingRequest.requester.name || 'Guest',
                    meetingTitle: meetingRequest.title,
                });
            }

            return NextResponse.json({ success: true });
        }
    } catch (error) {
        console.error('Error responding to request:', error);
        return NextResponse.json({ error: 'Failed to respond' }, { status: 500 });
    }
}
