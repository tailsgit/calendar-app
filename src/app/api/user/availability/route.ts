import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET - Fetch user's availability
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch availability
        const availability = await prisma.availability.findMany({
            where: { userId: session.user.id },
            orderBy: { dayOfWeek: 'asc' },
        });

        // Ensure Booking Page Exists
        let bookingPage = await prisma.bookingPage.findFirst({
            where: { userId: session.user.id }
        });

        if (!bookingPage) {
            const emailPrefix = session.user.email ? session.user.email.split('@')[0] : 'user';
            const baseSlug = emailPrefix.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
            let slug = baseSlug;
            let counter = 1;

            // Simple uniqueness check (retry loop)
            while (true) {
                const existing = await prisma.bookingPage.findUnique({ where: { slug } });
                if (!existing) break;
                slug = `${baseSlug}-${counter}`;
                counter++;
            }

            bookingPage = await prisma.bookingPage.create({
                data: {
                    userId: session.user.id,
                    slug,
                    title: `Meet with ${session.user.name || 'Me'}`,
                    description: 'Please select a time that works for you.',
                    duration: 30
                }
            });
        }

        return NextResponse.json({
            slots: availability,
            slug: bookingPage.slug
        });
    } catch (error) {
        console.error('Error fetching availability:', error);
        return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
    }
}

// PUT - Update user's availability (Full Replacement)
export async function PUT(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { availability } = body; // Array of slots

        if (!Array.isArray(availability)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        const userId = session.user.id;

        // Transaction: Delete all existing, then create new
        await prisma.$transaction([
            prisma.availability.deleteMany({
                where: { userId },
            }),
            prisma.availability.createMany({
                data: availability.map((slot: any) => ({
                    userId,
                    dayOfWeek: slot.dayOfWeek,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    isEnabled: true, // Always enabled if present in grid
                })),
            }),
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating availability:', error);
        return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 });
    }
}
