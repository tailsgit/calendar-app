import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { addMinutes, subMinutes, formatISO, format } from 'date-fns';
import { sendSelfReminder } from '@/lib/email';

export async function GET(request: NextRequest) {
    // SECURITY: In production, verify a "CRON_SECRET" header.
    // For this demo/local, we allow open access or check a simple query param if needed.

    try {
        const now = new Date();
        const results = [];

        // We check for reminders: 5m, 10m, 15m, 30m, 60m
        const checks = [5, 10, 15, 30, 60];

        for (const minutes of checks) {
            // Target Start Time = Now + Minutes
            // e.g. If looking for 5m reminders, we want events starting at Now + 5m
            const targetStart = addMinutes(now, minutes);

            // Define a window (e.g., +/- 1 minute) to catch events
            const windowStart = subMinutes(targetStart, 1);
            const windowEnd = addMinutes(targetStart, 1);

            // Find events starting in this window
            const events = await prisma.event.findMany({
                where: {
                    startTime: {
                        gte: windowStart,
                        lte: windowEnd
                    },
                    status: 'SCHEDULED'
                },
                include: {
                    owner: true,
                    participants: {
                        include: { user: true }
                    }
                }
            });

            for (const event of events) {
                // Collect users to notify
                const recipients = new Map<string, string>(); // userId -> name for logging

                // 1. Check Owner
                if (event.owner.meetingReminders?.split(',').includes(String(minutes))) {
                    recipients.set(event.owner.id, event.owner.name || 'Owner');
                }

                // 2. Check Participants (only if they are registered Users with settings)
                for (const p of event.participants) {
                    if (p.user && p.user.meetingReminders?.split(',').includes(String(minutes))) {
                        recipients.set(p.user.id, p.user.name || 'Participant');
                    }
                }

                // 3. Send Notifications (DB + Console)
                for (const [userId, userName] of recipients.entries()) {
                    // Check if already notified for this event + type? 
                    // (Simplification: we assume the cron runs once per window, or we tolerate dupes for this MVP)

                    await prisma.notification.create({
                        data: {
                            userId,
                            type: 'reminder',
                            title: `Upcoming: ${event.title}`,
                            message: `Starting in ${minutes} minutes.`,
                            link: `/events/${event.id}`
                        }
                    });

                    // SEND EMAIL REMINDER
                    try {
                        const user = await prisma.user.findUnique({
                            where: { id: userId },
                            select: { email: true, name: true }
                        });

                        if (user && user.email) {
                            await sendSelfReminder({
                                userEmail: user.email,
                                userName: user.name || 'User',
                                meetingTitle: event.title,
                                date: format(new Date(event.startTime), 'EEEE, MMMM d, yyyy'),
                                time: format(new Date(event.startTime), 'h:mm a'),
                                reminderType: minutes <= 15 ? 'starting_soon' : 'upcoming'
                            });
                        }
                    } catch (emailErr) {
                        console.error('Failed to send email reminder', emailErr);
                    }

                    results.push({
                        event: event.title,
                        user: userName,
                        minutes
                    });
                }
            }
        }

        return NextResponse.json({
            success: true,
            checkedAt: now.toISOString(),
            notificationsSent: results.length,
            details: results
        });

    } catch (error) {
        console.error('Cron Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
