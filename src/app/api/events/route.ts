import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { addDays, format, parse, setHours, setMinutes, startOfDay } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { RRule } from 'rrule';

// Helper to expand recurring events
function expandRecurringEvents(events: any[], start: Date, end: Date) {
    const expanded: any[] = [];

    events.forEach(event => {
        if (!event.recurrence || event.recurrence === 'NONE') return;

        try {
            // Check if it's a legacy simple rule or RRule string
            // If it doesn't start with FREQ, map legacy to RRule
            let ruleString = event.recurrence;
            if (!ruleString.startsWith('FREQ') && !ruleString.startsWith('RRULE')) {
                // Map legacy enums: DAILY, WEEKLY, etc.
                const map: Record<string, string> = {
                    'DAILY': 'FREQ=DAILY',
                    'WEEKLY': 'FREQ=WEEKLY',
                    'BIWEEKLY': 'FREQ=WEEKLY;INTERVAL=2',
                    'MONTHLY': 'FREQ=MONTHLY'
                };
                if (map[ruleString]) ruleString = map[ruleString];
                else return; // Unknown format
            }

            // Create RRule set
            const rule = RRule.fromString(ruleString);

            // Adjust dtstart to event start time (RRule uses it for time of day)
            const eventStart = new Date(event.startTime);
            const duration = new Date(event.endTime).getTime() - eventStart.getTime();

            // Override dtstart in options if needed, or rely on calling betweeen
            // RRule.fromString parses basic string. To apply correct TZ/Time, we might need options.
            // Simplified approach: Use rule to get dates, then overlay time.

            // Note: RRule.fromString might not include DTSTART if the string is just FREQ=...
            // We need to construct a new RRule forcing the start date
            const options = RRule.parseString(ruleString);
            options.dtstart = eventStart;

            const rrule = new RRule(options);

            // Get occurrences
            const dates = rrule.between(start, end, true);

            dates.forEach(date => {
                // Create instance
                const instanceStart = date;
                const instanceEnd = new Date(date.getTime() + duration);

                expanded.push({
                    ...event,
                    id: `${event.id}_${instanceStart.getTime()}`, // Synthetic ID
                    startTime: instanceStart.toISOString(),
                    endTime: instanceEnd.toISOString(),
                    isRecurringInstance: true
                });
            });
        } catch (e) {
            console.error('Error expanding recurrence for event', event.id, e);
        }
    });

    return expanded;
}

// Helper to generate lunch events
function generateLunchEvents(
    start: Date,
    end: Date,
    lunchStart: string,
    lunchEnd: string,
    userId: string,
    timeZone: string,
    lunchSchedule?: string | null
) {
    const events: any[] = [];
    const [defStartHour, defStartMin] = lunchStart.split(':').map(Number);
    const [defEndHour, defEndMin] = lunchEnd.split(':').map(Number);

    // Parse schedule if exists
    let schedule: Record<string, { start: string, end: string, enabled: boolean }> = {};
    try {
        if (lunchSchedule) {
            schedule = JSON.parse(lunchSchedule);
        }
    } catch (e) {
        console.error('Failed to parse lunch schedule', e);
    }

    // We iterate from "start" day to "end" day
    let current = startOfDay(start);
    const endTime = end;

    while (current <= endTime) {
        // Check day specific schedule
        // date-fns provides 0=Sun, 1=Mon...6=Sat
        const dayIndex = current.getDay();
        const dayConfig = schedule[dayIndex.toString()];

        // If specific day config exists:
        // - if enabled=false, skip
        // - if enabled=true (or undefined), use specific times
        // If no config, fall back to default start/end (since lunchEnabled is true globally)

        if (dayConfig && dayConfig.enabled === false) {
            current = addDays(current, 1);
            continue;
        }

        const lStartStr = dayConfig ? dayConfig.start : lunchStart;
        const lEndStr = dayConfig ? dayConfig.end : lunchEnd;

        const [startHour, startMin] = lStartStr.split(':').map(Number);
        const [endHour, endMin] = lEndStr.split(':').map(Number);

        // 1. Create a string representation of the *Target Wall-Clock Time*
        //    date-fns-tz `fromZonedTime` takes a Date (interpreted as wall clock) or string.
        //    Constructing a string "YYYY-MM-DD HH:mm:ss" is robust.

        const dateStr = format(current, 'yyyy-MM-dd');
        const startStr = `${dateStr} ${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00`;
        const endStr = `${dateStr} ${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;

        // 2. Convert "12:00 New York" -> UTC Timestamp
        try {
            const lStart = fromZonedTime(startStr, timeZone);
            const lEnd = fromZonedTime(endStr, timeZone);

            // 3. Simple bounds check
            if (lStart < endTime && lEnd > start) {
                events.push({
                    id: `lunch-${dateStr}`,
                    title: 'Lunch 🍱',
                    description: 'Scheduled lunch break',
                    startTime: lStart.toISOString(),
                    endTime: lEnd.toISOString(),
                    color: '#6366F1', // Indigo for all events
                    isLunch: true,
                    locationType: 'IN_PERSON',
                    status: 'BUSY',
                    ownerId: userId,
                    participants: []
                });
            }
        } catch (e) {
            console.error('Error generating lunch event for', dateStr, e);
        }

        current = addDays(current, 1);
    }
    return events;
}

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const start = searchParams.get('start');
        const end = searchParams.get('end');
        const targetUserId = searchParams.get('userId');

        let userIdToFetch = session.user.id;

        // If fetching for another user, verify access
        if (targetUserId && targetUserId !== session.user.id) {
            // Check if they share any approved group
            const sharedGroups = await prisma.groupMember.findFirst({
                where: {
                    userId: session.user.id,
                    status: 'approved',
                    group: {
                        members: {
                            some: {
                                userId: targetUserId,
                                status: 'approved'
                            }
                        }
                    }
                }
            });

            // Also check if one leads a group the other is in
            const leaderCheck = await prisma.group.findFirst({
                where: {
                    OR: [
                        { leaderId: session.user.id, members: { some: { userId: targetUserId, status: 'approved' } } },
                        { leaderId: targetUserId, members: { some: { userId: session.user.id, status: 'approved' } } }
                    ]
                }
            });

            if (!sharedGroups && !leaderCheck) {
                return NextResponse.json({ error: 'You do not have access to this user\'s calendar' }, { status: 403 });
            }
            userIdToFetch = targetUserId;
        }

        const events = await prisma.event.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { ownerId: userIdToFetch },
                            {
                                participants: {
                                    some: {
                                        userId: userIdToFetch,
                                        status: { in: ['ACCEPTED', 'PENDING', 'PROPOSED', 'TENTATIVE', 'DECLINED'] }
                                    }
                                }
                            }
                        ]
                    },
                    {
                        OR: [
                            {
                                recurrence: 'NONE',
                                startTime: { gte: start ? new Date(start) : undefined },
                                endTime: { lte: end ? new Date(end) : undefined }
                            },
                            {
                                NOT: { recurrence: 'NONE' }
                            }
                        ]
                    }
                ]
            },
            include: {
                participants: true // Include participants to show status in UI if needed
            },
            orderBy: {
                startTime: 'asc',
            },
        });

        // Split events into static and recurring
        const staticEvents = events.filter(e => !e.recurrence || e.recurrence === 'NONE');
        const recurringEvents = events.filter(e => e.recurrence && e.recurrence !== 'NONE');

        // Expand recurring
        const expandedRecurring = start && end
            ? expandRecurringEvents(recurringEvents, new Date(start), new Date(end))
            : []; // Should verify start/end exist

        const finalEvents = [...staticEvents, ...expandedRecurring];

        // --- LUNCH INJECTION ---
        // Fetch user settings to check for lunch
        // Only inject if viewing specific user (userIdToFetch) or self
        if (userIdToFetch) {
            const userSettings = await prisma.user.findUnique({
                where: { id: userIdToFetch },
                select: { lunchEnabled: true, lunchStart: true, lunchEnd: true, lunchSchedule: true, timeZone: true }
            });

            if (userSettings?.lunchEnabled && start && end) {
                const lunchEvents = generateLunchEvents(
                    new Date(start),
                    new Date(end),
                    userSettings.lunchStart,
                    userSettings.lunchEnd,
                    userIdToFetch,
                    userSettings.timeZone,
                    userSettings.lunchSchedule
                );
                finalEvents.push(...lunchEvents);
            }
        }

        return NextResponse.json(finalEvents);
    } catch (error) {
        console.error('Error fetching events:', error);
        return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { title, description, startTime, endTime, locationType } = body;

        // Basic validation
        if (!title || !startTime || !endTime) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Availability check removed to allow owner to schedule freely
        /*
        if (user) {
           ... validation logic ...
        }
        */

        const event = await prisma.event.create({
            data: {
                title,
                description,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                locationType,
                ownerId: session.user.id,
                color: '#6366F1', // Default Indigo
                status: 'SCHEDULED',
            },
        });

        return NextResponse.json(event);
    } catch (error) {
        console.error('Error creating event:', error);
        return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }
}
