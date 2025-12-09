
import { addMinutes, parse, format, isBefore, isAfter, isEqual, areIntervalsOverlapping, set } from 'date-fns';

interface TimeWindow {
    dayOfWeek: number;
    startTime: string; // HH:MM
    endTime: string;   // HH:MM
}

interface CalendarEvent {
    start: Date;
    end: Date;
}

/**
 * The 2-Layer Filter: Office Hours Intersection Algorithm
 * 
 * Step 1: Allow-List (Office Hours from AvailabilitySchedule)
 * Step 2: Block-List (Calendar Events)
 * Step 3: Intersection & Buffer Logic
 */
export function getAvailableSlots(
    currentDate: Date,
    schedules: TimeWindow[],
    events: CalendarEvent[],
    meetingDurationMinutes: number,
    bufferMinutes: number = 0
): string[] { // Returns array of ISO strings or HH:MM start times

    const dayOfWeek = currentDate.getDay();
    const daySchedules = schedules.filter(s => s.dayOfWeek === dayOfWeek);

    if (daySchedules.length === 0) return [];

    const slots: Date[] = [];

    // Step 1: Generate all possible slots based ONLY on Office Hours (Allow-List)
    for (const schedule of daySchedules) {
        let slotStart = parseTimeOnDate(currentDate, schedule.startTime);
        const windowEnd = parseTimeOnDate(currentDate, schedule.endTime);

        while (true) {
            const slotEnd = addMinutes(slotStart, meetingDurationMinutes);

            // If the slot + duration exceeds the window, stop for this window
            if (isAfter(slotEnd, windowEnd)) break;

            // Add to candidate list
            slots.push(slotStart);

            // Move to next slot (Start + Duration + Buffer)
            // *Wait, usually slots are generated at intervals? The prompt says "prevents students from booking slots back-to-back without a break"*
            // "prevents ... back-to-back without a break" implies the buffer is AFTER the meeting.
            // So the next slot can only start at start + duration + buffer.
            // However, typical booking systems offer slots at fixed intervals (e.g. every 15 or 30 mins) 
            // AND check if that specific slot + buffer overlaps. 
            // If the requirement is strict generation *by* buffer:
            slotStart = addMinutes(slotStart, meetingDurationMinutes + bufferMinutes);
        }
    }

    // Step 2 & 3: Filter (Block-List Intersection)
    const validSlots = slots.filter(slotStart => {
        const slotEnd = addMinutes(slotStart, meetingDurationMinutes);
        // Buffer acts as an extension of the busy time needed? 
        // Requirement: "prevents students from booking slots back-to-back without a break"
        // Usually means if I book 10:00-10:30, I am busy 10:00-10:30. 
        // If buffer is 15min, I am effectively "busy" or "blocking" 10:00-10:45 for *other* meetings?
        // OR does it mean if there is an event 9:00-10:00, I can't book 10:00?
        // Let's assume standard "Effective Duration" = Duration + Buffer.
        // The slot itself is [start, end].
        // We strictly check if [start, end] overlaps with any event.
        // AND check if [start - buffer, end + buffer] overlaps?
        // "prevents students from booking slots back-to-back without a break"
        // If Teacher has an event 10:00-11:00.
        // Student can't book 11:00-11:30 if buffer is required?
        // Let's assume the Buffer applies to the *App* generated slots logic we just did (Interval = Duration + Buffer).
        // So distinct slots are already separated by buffer.
        // Now we just need to check if the *actual meeting time* overlaps with existing events.

        // Check conflicts
        const hasConflict = events.some(event => {
            return areIntervalsOverlapping(
                { start: slotStart, end: slotEnd },
                { start: event.start, end: event.end }
            );
        });

        return !hasConflict;
    });

    return validSlots.map(date => format(date, 'HH:mm'));
}

function parseTimeOnDate(date: Date, timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
}
