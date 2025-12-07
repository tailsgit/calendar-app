import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const bookingPage = await prisma.bookingPage.findUnique({
            where: { slug },
            include: { user: { select: { name: true, email: true, image: true } } },
        });

        if (!bookingPage) {
            return NextResponse.json({ error: 'Booking page not found' }, { status: 404 });
        }

        return NextResponse.json(bookingPage);
    } catch (error) {
        console.error('Error fetching booking page:', error);
        return NextResponse.json({ error: 'Failed to fetch booking page' }, { status: 500 });
    }
}
