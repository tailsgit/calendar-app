
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/booking/[slug] - Get booking page details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> } // Params is a promise in Next.js 15+
) {
    try {
        const { slug } = await params;

        const bookingPage = await prisma.bookingPage.findUnique({
            where: { slug, isActive: true },
            include: {
                user: {
                    select: {
                        name: true,
                        image: true,
                        email: true,
                        timeZone: true
                    }
                }
            }
        });

        if (!bookingPage) {
            return NextResponse.json({ error: 'Booking page not found' }, { status: 404 });
        }

        return NextResponse.json(bookingPage);
    } catch (error) {
        console.error('Error fetching booking page:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
