
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';
import { format } from 'date-fns';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { title, startTime, endTime, participants, locationType, notes } = body;

        if (!title || !startTime || !endTime || !participants) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Fetch emails for participants
        // We need accurate emails for the Participant table
        const participantIds = participants.map((p: any) => p.id);
        const usersWithEmail = await prisma.user.findMany({
            where: { id: { in: participantIds } },
            select: { id: true, email: true, name: true }
        });

        const userMap = new Map(usersWithEmail.map(u => [u.id, u]));

        // Prepare participant data
        // If a user doesn't have an email in DB, we skip them or handle error
        // Realistically all users should have emails.
        const validParticipants = participants.map((p: any) => {
            const user = userMap.get(p.id);
            if (!user || !user.email) return null;
            return {
                userId: p.id,
                name: user.name || p.name,
                email: user.email,
                status: 'PENDING'
            };
        }).filter(Boolean);

        if (validParticipants.length === 0) {
            return NextResponse.json({ error: 'No valid participants found (missing emails)' }, { status: 400 });
        }

        // Check for duplicate pending requests
        // Find if there is an event at the same time where these exact participants are involved
        const requestedParticipantIds = [session.user.id, ...validParticipants.map((p: any) => p.userId)];

        const existingConflictingEvent = await prisma.event.findFirst({
            where: {
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                status: 'PROPOSED',
                participants: {
                    every: {
                        userId: { in: requestedParticipantIds }
                    }
                }
            },
            include: { participants: true }
        });

        // The above query checks if *all* participants of the found event are in our list.
        // We also want to ensure the found event doesn't have *fewer* participants, 
        // effectively checking for an exact match or subset. 
        // But for "same exact people", we should check count.

        if (existingConflictingEvent) {
            const existingIds = existingConflictingEvent.participants.map(p => p.userId);
            // Check if strict equality of participant sets
            const isSameSet = existingIds.length === requestedParticipantIds.length &&
                existingIds.every(id => requestedParticipantIds.includes(id));

            if (isSameSet) {
                return NextResponse.json({
                    error: 'A meeting request is already pending for this group at this time.'
                }, { status: 409 });
            }
        }

        // 1. Create the Event
        const event = await prisma.event.create({
            data: {
                title,
                description: notes,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                locationType: locationType || 'VIDEO',
                ownerId: session.user.id,
                status: 'PROPOSED', // Changed from SCHEDULED
                participants: {
                    create: [
                        // Creator is automatically a participant who has ACCEPTED
                        {
                            userId: session.user.id,
                            name: session.user.name,
                            email: session.user.email,
                            status: 'ACCEPTED'
                        },
                        // Other participants are PENDING
                        ...validParticipants.map((p: any) => ({
                            userId: p.userId,
                            name: p.name,
                            email: p.email,
                            status: 'PENDING'
                        }))
                    ]
                }
            },
            include: {
                participants: true
            }
        });

        // 2. Send Notifications to all participants
        const formattedDate = format(new Date(startTime), 'MMM d, h:mm a');

        await Promise.all(validParticipants.map(async (p: any) => {
            // Skip notifying yourself if you are in the list
            if (p.userId === session.user?.id) return;

            await createNotification({
                userId: p.userId,
                type: 'booking',
                title: '📅 New Meeting Proposal',
                message: `${session.user?.name} via Smart Finder: Proposed "${title}" on ${formattedDate}`,
                link: `/` // TODO: Deep link to event
            });
        }));

        // 3. Notify Owner (optional, confirmation)
        await createNotification({
            userId: session.user.id,
            type: 'booking',
            title: '✅ Meeting Scheduled',
            message: `You scheduled "${title}" with ${validParticipants.length} people.`,
            link: `/`
        });

        return NextResponse.json({ success: true, event });
    } catch (error) {
        console.error('Error creating smart meeting:', error);
        return NextResponse.json({ error: 'Failed to create meeting. Please check server logs.' }, { status: 500 });
    }
}
