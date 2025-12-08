import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET - Fetch current user profile
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                name: true,
                email: true,
                image: true,
                title: true,
                department: true,
                status: true,
                timeZone: true,
                lunchEnabled: true,
                lunchEnd: true,
                lunchSchedule: true,
                meetingReminders: true,
                accounts: {
                    select: {
                        provider: true,
                    }
                }
            },
        });

        return NextResponse.json(user);
    } catch (error) {
        console.error('Error fetching profile:', error);
        return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }
}

// PUT - Update user profile
export async function PUT(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        console.log('[DEBUG] PUT /api/user/profile Body:', body);
        const { name, department, title, status, timeZone, lunchEnabled, lunchStart, lunchEnd, meetingReminders, lunchSchedule } = body;

        const user = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                name, department, title, status, timeZone,
                lunchEnabled, lunchStart, lunchEnd, lunchSchedule,
                meetingReminders
            },
        });

        return NextResponse.json(user);
    } catch (error: any) {
        console.error('Error updating profile:', error);
        return NextResponse.json({ error: `Failed to update profile: ${error.message}` }, { status: 500 });
    }
}
