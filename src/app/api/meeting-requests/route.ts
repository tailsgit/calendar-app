import { NextRequest, NextResponse } from 'next/server';
import { sendMeetingInvite } from '@/lib/email';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

// POST - Create new meeting request
export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            recipientId,
            title,
            startTime,
            endTime,
            duration,
            locationType,
            locationDetails,
            message
        } = body;

        if (!recipientId || !title || !startTime || !endTime) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Fetch recipient details for email and validation
        const recipient = await prisma.user.findUnique({
            where: { id: recipientId },
            select: {
                email: true,
                name: true,
                timeZone: true,
                availability: true
            }
        });

        if (!recipient?.email) {
            return NextResponse.json({ error: 'Recipient not found or has no email' }, { status: 404 });
        }

        // Validate Availability
        const requestStart = new Date(startTime);
        const requestEnd = new Date(endTime);
        const timeZone = recipient.timeZone || 'UTC';

        // Get day of week and time in recipient's timezone
        // Safer way to get day index in specific timezone
        const dateInTz = new Date(requestStart.toLocaleString('en-US', { timeZone }));
        const dayIndex = dateInTz.getDay();

        const startMinutes = dateInTz.getHours() * 60 + dateInTz.getMinutes();
        const endMinutes = startMinutes + duration;

        const dayConfig = recipient.availability.find(a => a.dayOfWeek === dayIndex);

        if (!dayConfig || !dayConfig.isEnabled) {
            return NextResponse.json({ error: 'Recipient is not available on this day' }, { status: 400 });
        }

        const [availStartHour, availStartMin] = dayConfig.startTime.split(':').map(Number);
        const [availEndHour, availEndMin] = dayConfig.endTime.split(':').map(Number);
        const availStartMinutes = availStartHour * 60 + availStartMin;
        const availEndMinutes = availEndHour * 60 + availEndMin;

        if (startMinutes < availStartMinutes || endMinutes > availEndMinutes) {
            return NextResponse.json({
                error: `Recipient is only available between ${dayConfig.startTime} and ${dayConfig.endTime}`
            }, { status: 400 });
        }

        const requestData = {
            requesterId: session.user.id,
            recipientId,
            title,
            startTime: requestStart,
            endTime: requestEnd,
            duration,
            locationType,
            locationDetails,
            message,
            status: 'PENDING',
        };

        const meetingRequest = await prisma.meetingRequest.create({
            data: requestData,
        });

        // Notify recipient (In-App)
        await createNotification({
            userId: recipientId,
            type: 'booking',
            title: 'New Meeting Request',
            message: `${session.user.name} requested: "${title}"`,
            link: `/requests`,
        });

        // Notify recipient (Email)
        await sendMeetingInvite({
            senderEmail: session.user.email!,
            senderName: session.user.name!,
            recipientEmail: recipient.email,
            recipientName: recipient.name || 'Colleague',
            meetingTitle: title,
            date: requestStart.toLocaleDateString(),
            time: requestStart.toLocaleTimeString(),
            duration,
            locationType,
            description: message,
            requestId: meetingRequest.id, // Pass ID to enable Action Buttons in email
        });

        return NextResponse.json({ meetingRequest });
    } catch (error) {
        console.error('Error creating meeting request:', error);
        return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
    }
}

// GET - List pending requests for current user
export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const requests = await prisma.meetingRequest.findMany({
            where: {
                recipientId: session.user.id,
                status: 'PENDING',
            },
            include: {
                requester: {
                    select: { name: true, image: true, email: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ requests });
    } catch (error) {
        console.error('Error fetching requests:', error);
        return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }
}
