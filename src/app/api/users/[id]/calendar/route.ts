import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, startOfDay } from 'date-fns';
import { getGoogleCalendarEvents } from '@/lib/google';
import { getOutlookCalendarEvents } from '@/lib/outlook';

// GET - Fetch user's profile and busy slots
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id } = await params;
        const targetUserId = id;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Basic validation
        if (!targetUserId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // Get date range from query params or default to current week
        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get('date');
        const baseDate = dateParam ? new Date(dateParam) : new Date();

        const startDate = startOfWeek(baseDate, { weekStartsOn: 1 }); // Monday
        const endDate = addDays(startDate, 7); // Changed from endOfWeek to addDays(startDate, 7)

        // Fetch user profile
        const user = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                status: true,
                department: true,
                title: true,
                timeZone: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check if they are in the same group (Team Member)
        // Relaxed Check: If either leads a group the other is in, or both are members of same group
        const sharedGroup = await prisma.groupMember.findFirst({
            where: {
                userId: session.user.id,
                status: 'approved',
                group: {
                    members: {
                        some: {
                            userId: targetUserId,
                            status: 'approved'
                        }
                    }
                }
            }
        });

        // Also check leadership: if I lead a group they are in, or they lead a group I am in
        const leadership = await prisma.group.findFirst({
            where: {
                OR: [
                    { leaderId: session.user.id, members: { some: { userId: targetUserId, status: 'approved' } } },
                    { leaderId: targetUserId, members: { some: { userId: session.user.id, status: 'approved' } } }
                ]
            }
        });

        const isTeamMember = !!(sharedGroup || leadership);

        // Fetch confirmed events (busy slots)
        // We fetch their events to show actual busy times
        const events = await prisma.event.findMany({
            where: {
                ownerId: targetUserId,
                startTime: { gte: startDate },
                endTime: { lte: endDate },
                status: { not: 'CANCELLED' }
            },
            select: { id: true, startTime: true, endTime: true, status: true }
        });

        // Also fetch participation in other events
        const participations = await prisma.participant.findMany({
            where: {
                userId: targetUserId,
                status: { in: ['ACCEPTED', 'PENDING'] },
                event: {
                    startTime: { gte: startDate },
                    endTime: { lte: endDate },
                    status: { not: 'CANCELLED' }
                }
            },
            include: { event: { select: { id: true, startTime: true, endTime: true, status: true } } }
        });

        // Fetch pending meeting requests (also busy/tentative)
        const pendingRequests = await prisma.meetingRequest.findMany({
            where: {
                recipientId: targetUserId,
                startTime: { gte: startDate },
                endTime: { lte: endDate },
                status: 'PENDING',
            },
            select: {
                id: true,
                startTime: true,
                endTime: true,
                status: true,
            },
        });

        // --- FETCH EXTERNAL EVENTS (Google / Outlook) ---
        // Fetch in parallel. These functions handle token lookup and return [] if no connection.
        const [googleEvents, outlookEvents] = await Promise.all([
            getGoogleCalendarEvents(targetUserId, startDate, endDate),
            getOutlookCalendarEvents(targetUserId, startDate, endDate)
        ]);

        const externalBusySlots = [...googleEvents, ...outlookEvents].map(e => ({
            id: e.id,
            startTime: e.start,
            endTime: e.end,
            status: 'BUSY',
            title: 'Busy', // Mask title for now, or use e.title if team member logic expands
            type: 'external_event'
        }));

        // Combine into busy slots
        const busySlots = [
            ...events.map(e => ({ ...e, type: 'event' })),
            ...participations.map(p => ({ ...p.event, type: 'event' })),
            ...pendingRequests.map(r => ({ ...r, type: 'request' })),
            ...externalBusySlots
        ];

        // Fetch availability
        const availability = await prisma.availability.findMany({
            where: { userId: targetUserId },
            orderBy: { dayOfWeek: 'asc' },
        });

        return NextResponse.json({ user, busySlots, availability, weekStart: startDate, weekEnd: endDate, isTeamMember });
    } catch (error) {
        console.error('Error fetching user calendar:', error);
        return NextResponse.json({ error: 'Failed to fetch calendar' }, { status: 500 });
    }
}
