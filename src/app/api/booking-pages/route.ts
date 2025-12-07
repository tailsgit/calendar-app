import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const bookingPages = await prisma.bookingPage.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(bookingPages);
    } catch (error) {
        console.error('Error fetching booking pages:', error);
        return NextResponse.json({ error: 'Failed to fetch booking pages' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, slug, description, duration } = body;

        if (!title || !slug) {
            return NextResponse.json({ error: 'Title and slug are required' }, { status: 400 });
        }

        // Check if slug is already taken
        const existing = await prisma.bookingPage.findUnique({ where: { slug } });
        if (existing) {
            return NextResponse.json({ error: 'This URL is already taken' }, { status: 409 });
        }

        // Get or create demo user
        let user = await prisma.user.findFirst();
        if (!user) {
            user = await prisma.user.create({
                data: { email: 'demo@example.com', name: 'Demo User' },
            });
        }

        const bookingPage = await prisma.bookingPage.create({
            data: {
                title,
                slug,
                description: description || '',
                duration: duration || 30,
                userId: user.id,
            },
        });

        return NextResponse.json(bookingPage);
    } catch (error) {
        console.error('Error creating booking page:', error);
        return NextResponse.json({ error: 'Failed to create booking page' }, { status: 500 });
    }
}
