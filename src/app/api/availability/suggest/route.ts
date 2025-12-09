import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { addDays, setHours, setMinutes, startOfDay, endOfDay, isBefore, isAfter, addMinutes, isWeekend } from 'date-fns';

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        // Default duration 30 mins
        const durationParam = searchParams.get('duration');
        const durationMinutes = durationParam ? parseInt(durationParam) : 30;

        // Default look ahead next 7 days
        const now = new Date();
        const lookAheadDays = 14;

        let targetUserId = session.user.id;

        // Fetch user's events for the next 2 weeks
        const startDate = startOfDay(now);
        const endDate = endOfDay(addDays(now, lookAheadDays));

        const events = await prisma.event.findMany({
            where: {
                OR: [
                    { ownerId: targetUserId },
                    {
                        participants: {
                            some: {
                                userId: targetUserId,
                                status: { in: ['ACCEPTED', 'PENDING', 'PROPOSED'] }
                            }
                        }
                    }
                ],
                startTime: { gte: startDate },
                endTime: { lte: endDate },
                status: { not: 'CANCELLED' }
            },
            orderBy: { startTime: 'asc' }
        });

        // Simple Slot Finding Algorithm
        // M-F, 09:00 - 17:00
        const workStartHour = 9;
        const workEndHour = 17;

        let foundSlot: { start: Date; end: Date } | null = null;
        let currentDay = now;

        // Loop through days
        for (let i = 0; i < lookAheadDays; i++) {
            if (foundSlot) break;

            // Skip weekends
            if (isWeekend(currentDay)) {
                currentDay = addDays(currentDay, 1);
                currentDay = setHours(setMinutes(currentDay, 0), workStartHour); // Reset to 9am next day
                continue;
            }

            // Define work hours for this day
            let workStart = setHours(setMinutes(currentDay, 0), workStartHour);
            const workEnd = setHours(setMinutes(currentDay, 0), workEndHour);

            // If today, and currently past 9am, start from now (rounded up to next 15/30 min?)
            // If now is past 5pm, skip to tomorrow
            if (i === 0) {
                if (isAfter(now, workEnd)) {
                    currentDay = addDays(currentDay, 1);
                    continue;
                }
                if (isAfter(now, workStart)) {
                    // Round up to next 30 min slot for cleanliness?
                    const minutes = now.getMinutes();
                    const remainder = 30 - (minutes % 30);
                    workStart = addMinutes(now, remainder);
                }
            }

            // Iterate through the day in 'duration' increments? 
            // Better: Iterate by potential start times (e.g. every 15 mins) and check overlap
            let slotStart = workStart;

            while (isBefore(slotStart, workEnd)) {
                const slotEnd = addMinutes(slotStart, durationMinutes);

                if (isAfter(slotEnd, workEnd)) break; // Past 5pm

                // Check collision
                const hasCollision = events.some(event => {
                    const eStart = new Date(event.startTime);
                    const eEnd = new Date(event.endTime);
                    return (
                        (slotStart >= eStart && slotStart < eEnd) || // Start is inside
                        (slotEnd > eStart && slotEnd <= eEnd) ||   // End is inside
                        (slotStart <= eStart && slotEnd >= eEnd)   // Envelops
                    );
                });

                if (!hasCollision) {
                    foundSlot = { start: slotStart, end: slotEnd };
                    break;
                }

                // If collision, move start to just after the collision event? or just +15 mins
                // Simple: +15 mins
                slotStart = addMinutes(slotStart, 30); // Check every 30 mins for now to be fast
            }

            currentDay = addDays(currentDay, 1);
            currentDay = setHours(setMinutes(currentDay, 0), workStartHour);
        }

        if (foundSlot) {
            return NextResponse.json({
                available: true,
                slot: {
                    start: foundSlot.start.toISOString(),
                    end: foundSlot.end.toISOString()
                }
            });
        }

        return NextResponse.json({ available: false, message: 'No slots found in next 14 days' });

    } catch (error) {
        console.error('Error finding availability:', error);
        return NextResponse.json({ error: 'Failed to find time' }, { status: 500 });
    }
}
