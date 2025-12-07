
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { startOfDay, endOfDay, setHours, setMinutes, isBefore, isAfter, max, min, addMinutes } from 'date-fns';

interface UserTimezone {
    userId: string;
    timezone: string;
    // Simple 9-5 working hours for MVP, can be expanded to full Availability model later
    startHour: number;
    endHour: number;
}

export interface TimeRange {
    start: Date;
    end: Date;
}

/**
 * Finds the "Golden Hours" where all users are within their working hours.
 * Returns ranges in UTC.
 */
export function findGoldenHours(users: UserTimezone[], date: Date): TimeRange[] {
    if (users.length === 0) return [];

    // The target date is just a reference for "today"
    // We want to find overlap for the 24-hour cycle of that date

    // 1. Get each user's working hours converted to UTC intervals for the target day
    // We actually need to look at a 48 hour window to handle day shifts (someone in Tokyo vs NY)
    // But for simplicity of "Golden Hour for [Date]", let's try to find potential times *on that calendar date* 
    // from the perspective of the viewer? No, usually "Golden Hour" implies absolute time overlap.

    // Let's iterate through 15-minute slots for the entire 24h day (UTC) and check if it falls into EVERYONE's working hours.

    const slots: TimeRange[] = [];
    const dayStart = startOfDay(date); // 00:00 Local (Server time?) -> Be careful. 
    // Let's treat the input 'date' as UTC 00:00 for the day we are checking.

    // Iterate 00:00 to 23:45 UTC
    for (let i = 0; i < 24 * 4; i++) {
        const slotStart = addMinutes(dayStart, i * 15);
        const slotEnd = addMinutes(slotStart, 15);

        let allAvailable = true;

        for (const user of users) {
            // Convert slot UTC time to User's Zoned Time
            const userTime = toZonedTime(slotStart, user.timezone);
            const userHour = userTime.getHours();
            const userMinute = userTime.getMinutes();
            const timeFloat = userHour + userMinute / 60;

            // Check if within 9am - 5pm (or user prefs)
            if (timeFloat < user.startHour || timeFloat >= user.endHour) {
                allAvailable = false;
                break;
            }

            // Check if it's weekend for them? 
            // const day = userTime.getDay();
            // if (day === 0 || day === 6) { allAvailable = false; break; }
        }

        if (allAvailable) {
            // Merge with previous if contiguous
            const last = slots[slots.length - 1];
            if (last && last.end.getTime() === slotStart.getTime()) {
                last.end = slotEnd;
            } else {
                slots.push({ start: slotStart, end: slotEnd });
            }
        }
    }

    return slots;
}
