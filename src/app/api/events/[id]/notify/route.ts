import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { sendSelfReminder } from '@/lib/email';

export async function POST(
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
        const { type, delayMinutes, message } = body;

        // Fetch event to verify ownership or participation
        const event = await prisma.event.findUnique({
            where: { id },
            include: {
                participants: true,
                owner: true,
            },
        });

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Check if user is owner or participant
        const isOwner = event.ownerId === session.user.id;
        const isParticipant = event.participants.some(p => p.email === session.user?.email); // Simplified check, assumes email match

        if (!isOwner && !isParticipant) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Identify recipients (everyone except the sender)
        const recipients = new Set<string>();

        // Add owner if sender is not owner
        if (event.ownerId !== session.user.id) {
            recipients.add(event.ownerId);
        }

        // Add participants linked to users (skipping sender)
        event.participants.forEach(p => {
            if (p.userId && p.userId !== session.user?.id) {
                recipients.add(p.userId);
            }
        });

        if (recipients.size === 0) {
            return NextResponse.json({ message: 'No other participants to notify' });
        }

        // Create Notifications
        const notificationMessage = message || `${session.user.name} is running ${delayMinutes} minutes late for "${event.title}".`;

        await prisma.notification.createMany({
            data: Array.from(recipients).map(userId => ({
                userId,
                type: 'running_late',
                title: 'Running Late',
                message: notificationMessage,
                link: `/events/${id}`, // Optional: redirect to event
            })),
        });

        // Send Emails
        // We iterate and send individual emails (simplified for now)
        const recipientsArray = Array.from(recipients);
        for (const recipientId of recipientsArray) {
            const user = await prisma.user.findUnique({ where: { id: recipientId } });
            if (user?.email) {
                await sendSelfReminder({
                    userEmail: user.email,
                    userName: user.name || 'User',
                    meetingTitle: event.title,
                    date: new Date(event.startTime).toLocaleDateString(),
                    time: new Date(event.startTime).toLocaleTimeString(),
                    reminderType: 'running_late'
                });
            }
        }

        return NextResponse.json({ success: true, recipients: Array.from(recipients) });

    } catch (error) {
        console.error('Error sending notification:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
