import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendBookingConfirmation } from '@/lib/email';
import { format } from 'date-fns';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { bookingPageId, guestName, guestEmail, date, time } = body;

        if (!bookingPageId || !guestName || !guestEmail || !date || !time) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        // Get the booking page to find duration and owner
        const bookingPage = await prisma.bookingPage.findUnique({
            where: { id: bookingPageId },
            include: { user: true },
        });

        if (!bookingPage) {
            return NextResponse.json({ error: 'Booking page not found' }, { status: 404 });
        }

        // Create the event
        const startTime = new Date(`${date}T${time}`);
        const endTime = new Date(startTime.getTime() + bookingPage.duration * 60000);

        const event = await prisma.event.create({
            data: {
                title: `Meeting with ${guestName}`,
                description: `Booked via ${bookingPage.title}`,
                startTime,
                endTime,
                locationType: 'VIDEO',
                color: '#10B981',
                ownerId: bookingPage.userId,
                participants: {
                    create: {
                        email: guestEmail,
                        name: guestName,
                        status: 'PENDING',
                    },
                },
            },
        });

        // Send confirmation emails using smart email system
        // - Guest receives invite FROM host
        // - Host receives self-confirmation
        const formattedDate = format(startTime, 'EEEE, MMMM d, yyyy');
        const formattedTime = format(startTime, 'h:mm a');

        if (bookingPage.user?.email) {
            await sendBookingConfirmation({
                hostEmail: bookingPage.user.email,
                hostName: bookingPage.user.name || 'Host',
                // In future: pass hostCredentials from user's connected Gmail
                guestEmail,
                guestName,
                meetingTitle: bookingPage.title,
                date: formattedDate,
                time: formattedTime,
                duration: bookingPage.duration,
                locationType: 'VIDEO',
            });
        }

        return NextResponse.json({ success: true, eventId: event.id });
    } catch (error) {
        console.error('Error creating booking:', error);
        return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }
}


