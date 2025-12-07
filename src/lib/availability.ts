
import prisma from "@/lib/prisma";
import { getGoogleCalendarEvents } from "./google";
import { getOutlookCalendarEvents } from "./outlook";
import { addMinutes, areIntervalsOverlapping, format, isBefore, startOfDay, addDays, getDay, parse } from "date-fns";

export interface TimeSlot {
    start: Date;
    end: Date;
    available: boolean;
}

/**
 * Fetch generic working hours for a user from DB.
 * Returns a map of dayOfWeek (0=Sun) -> { startTime: "09:00", endTime: "17:00", isEnabled: true }
 */
export async function getUserAvailability(userId: string) {
    const availability = await prisma.availability.findMany({
        where: { userId }
    });

    const availabilityMap = new Map<number, any>();
    availability.forEach(a => {
        availabilityMap.set(a.dayOfWeek, a);
    });
    return availabilityMap;
}

/**
 * Get all busy times (Internal Events + Google + Outlook)
 */
export async function getBusyTimes(userId: string, startDate: Date, endDate: Date) {
    // 1. Internal Events
    const internalEvents = await prisma.event.findMany({
        where: {
            ownerId: userId,
            startTime: { lt: endDate },
            endTime: { gt: startDate },
            status: { not: 'CANCELLED' }
        },
        select: { startTime: true, endTime: true }
    });

    // 2. Google Events
    let googleEvents = [];
    try {
        const gEvents = await getGoogleCalendarEvents(userId, startDate, endDate);
        googleEvents = gEvents.map((e: any) => ({
            startTime: e.start,
            endTime: e.end
        }));
    } catch (e) {
        console.error("Failed to fetch Google availability", e);
    }

    // 3. Outlook Events
    let outlookEvents = [];
    try {
        const oEvents = await getOutlookCalendarEvents(userId, startDate, endDate);
        outlookEvents = oEvents.map((e: any) => ({
            startTime: e.start,
            endTime: e.end
        }));
    } catch (e) {
        console.error("Failed to fetch Outlook availability", e);
    }

    return [...internalEvents, ...googleEvents, ...outlookEvents];
}

/**
 * Generate available slots based on:
 * - User's working hours (Availability)
 * - Duration of the meeting
 * - Existing conflicts (BusyTimes)
 */
export async function generateAvailableSlots(
    userId: string,
    startDate: Date,
    endDate: Date,
    durationMinutes: number
): Promise<string[]> {
    const availabilityMap = await getUserAvailability(userId);
    const busyTimes = await getBusyTimes(userId, startDate, endDate);

    const availableSlots: string[] = [];
    let currentDay = startOfDay(startDate);

    // Iterate through each day in range
    while (isBefore(currentDay, endDate)) {
        const dayOfWeek = getDay(currentDay);
        const config = availabilityMap.get(dayOfWeek);

        // If no config or disabled for this day, skip
        if (!config || !config.isEnabled) {
            currentDay = addDays(currentDay, 1);
            continue;
        }

        // Parse start/end times (e.g. "09:00" -> Date object for currentDay)
        const dayStart = parse(config.startTime, 'HH:mm', currentDay);
        const dayEnd = parse(config.endTime, 'HH:mm', currentDay);

        let slotStart = dayStart;

        // Generate slots for the day
        while (isBefore(addMinutes(slotStart, durationMinutes), dayEnd) || slotStart.getTime() === dayEnd.getTime()) {
            const slotEnd = addMinutes(slotStart, durationMinutes);

            // Check overlap with ANY busy time
            const isBusy = busyTimes.some(busy =>
                areIntervalsOverlapping(
                    { start: slotStart, end: slotEnd },
                    { start: new Date(busy.startTime), end: new Date(busy.endTime) }
                )
            );

            if (!isBusy) {
                availableSlots.push(slotStart.toISOString());
            }

            // Move to next slot (e.g. every 30 mins)
            // TODO: Make slot interval configurable? For now assume interval = duration or 30 mins defaults
            slotStart = addMinutes(slotStart, 30);
        }

        currentDay = addDays(currentDay, 1);
    }

    return availableSlots;
}
