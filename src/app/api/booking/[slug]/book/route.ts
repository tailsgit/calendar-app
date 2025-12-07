
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { addMinutes } from 'date-fns';

// POST /api/booking/[slug]/book - Create appointment
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const body = await request.json();
        const { name, email, startTime, notes } = body;

        if (!name || !email || !startTime) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const bookingPage = await prisma.bookingPage.findUnique({
            where: { slug, isActive: true },
            include: { user: true }
        });

        if (!bookingPage) {
            return NextResponse.json({ error: 'Booking page not found' }, { status: 404 });
        }

        const start = new Date(startTime);
        const end = addMinutes(start, bookingPage.duration);

        // TODO: Double check availability here to prevent race conditions?

        // Create Event
        const event = await prisma.event.create({
            data: {
                title: `${bookingPage.title} with ${name}`,
                description: notes,
                startTime: start,
                endTime: end,
                ownerId: bookingPage.userId,
                status: 'SCHEDULED',
                locationType: 'VIDEO', // Default for now
                participants: {
                    create: {
                        email,
                        name,
                        status: 'ACCEPTED'
                    }
                }
            }
        });

        return NextResponse.json({ success: true, eventId: event.id });
    } catch (error) {
        console.error('Error creating booking:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
