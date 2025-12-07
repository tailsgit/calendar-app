import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';

// GET - Fetch user's profile and busy slots
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get date range from query params or default to current week
        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get('date');
        const baseDate = dateParam ? new Date(dateParam) : new Date();

        const startDate = startOfWeek(baseDate, { weekStartsOn: 1 }); // Monday
        const endDate = endOfWeek(baseDate, { weekStartsOn: 1 });

        // Fetch user profile
        const user = await prisma.user.findUnique({
            where: { id },
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

        // Fetch confirmed events (busy slots)
        const events = await prisma.event.findMany({
            where: {
                ownerId: id,
                startTime: { gte: startDate },
                endTime: { lte: endDate },
                status: 'SCHEDULED',
            },
            select: {
                id: true,
                startTime: true,
                endTime: true,
                status: true,
            },
        });

        // Fetch pending meeting requests (also busy/tentative)
        const pendingRequests = await prisma.meetingRequest.findMany({
            where: {
                recipientId: id,
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

        // Combine into busy slots
        const busySlots = [
            ...events.map(e => ({ ...e, type: 'event' })),
            ...pendingRequests.map(r => ({ ...r, type: 'request' })),
        ];

        // Fetch availability
        const availability = await prisma.availability.findMany({
            where: { userId: id },
            orderBy: { dayOfWeek: 'asc' },
        });

        return NextResponse.json({ user, busySlots, availability, weekStart: startDate, weekEnd: endDate });
    } catch (error) {
        console.error('Error fetching user calendar:', error);
        return NextResponse.json({ error: 'Failed to fetch calendar' }, { status: 500 });
    }
}
