
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateAvailableSlots } from '@/lib/availability';

// GET /api/booking/[slug]/slots?start=...&end=... - Get available slots
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const searchParams = request.nextUrl.searchParams;
        const startParam = searchParams.get('start');
        const endParam = searchParams.get('end');

        if (!startParam || !endParam) {
            return NextResponse.json({ error: 'Missing start or end date' }, { status: 400 });
        }

        const bookingPage = await prisma.bookingPage.findUnique({
            where: { slug, isActive: true }
        });

        if (!bookingPage) {
            return NextResponse.json({ error: 'Booking page not found' }, { status: 404 });
        }

        const slots = await generateAvailableSlots(
            bookingPage.userId,
            new Date(startParam),
            new Date(endParam),
            bookingPage.duration
        );

        return NextResponse.json(slots);
    } catch (error) {
        console.error('Error fetching slots:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
