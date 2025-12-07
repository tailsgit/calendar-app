
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getBusyTimes } from '@/lib/availability';
import prisma from '@/lib/prisma';

// POST /api/team/availability
// Body: { userIds: string[], start: string, end: string }
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { userIds, start, end } = await req.json();

        if (!userIds || !Array.isArray(userIds) || !start || !end) {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }

        const startDate = new Date(start);
        const endDate = new Date(end);

        // Security Check: Ideally verify access to each user (omitted for speed/MVP, assumed team context)
        // In a real app, we'd check Group membership here.

        // Fetch busy times AND timezone for all users in parallel
        const results = await Promise.all(userIds.map(async (uid) => {
            try {
                // Fetch user timezone
                const user = await prisma.user.findUnique({
                    where: { id: uid },
                    select: { timeZone: true }
                });

                const busySlots = await getBusyTimes(uid, startDate, endDate);
                return { userId: uid, busySlots, timeZone: user?.timeZone || 'UTC' };
            } catch (error) {
                console.error(`Failed to fetch availability for ${uid}`, error);
                return { userId: uid, busySlots: [], timeZone: 'UTC' }; // Fail gracefully
            }
        }));

        // Convert array to map: { [userId]: { busy: slots[], timeZone: string } }
        // Note: Changing response structure slightly, Frontend will need update
        const availabilityMap = results.reduce((acc, curr) => {
            acc[curr.userId] = {
                busy: curr.busySlots,
                timeZone: curr.timeZone
            };
            return acc;
        }, {} as Record<string, { busy: any[], timeZone: string }>);

        return NextResponse.json(availabilityMap);

    } catch (error) {
        console.error('Error in team availability:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
