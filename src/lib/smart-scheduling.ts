
import { addMinutes, startOfDay, endOfDay, isBefore, isAfter, isSameDay, getDay, getHours, getMinutes, addDays, startOfHour, setHours, setMinutes } from 'date-fns';

export interface CalendarEvent {
    id: string;
    title: string;
    startTime: string | Date; // Support both for flexibility
    endTime: string | Date;
}

export interface UserCalendar {
    userId: string;
    events: CalendarEvent[];
}

export interface TimeSlot {
    start: Date;
    end: Date;
    score: number;
}

export interface SmartSuggestions {
    fifteenMinSlots: TimeSlot[];
    thirtyMinSlots: TimeSlot[];
    sixtyMinSlots: TimeSlot[];
}

// Configuration constants
const WORK_START_HOUR = 8;
const WORK_END_HOUR = 18; // 6 PM
const PRIME_START_HOUR = 10;
const PRIME_END_HOUR = 16; // 4 PM

/**
 * Main function to find the best time slots
 */
export function findBestTimeSlots(
    calendars: UserCalendar[],
    searchStartDate: Date = new Date(),
    daysToSearch: number = 7
): SmartSuggestions {
    // Normalize search window
    let startWindow = searchStartDate;
    // If it's already past 5 PM, start searching from tomorrow
    if (getHours(searchStartDate) >= 17) {
        startWindow = startOfDay(addDays(searchStartDate, 1));
    }

    const endWindow = endOfDay(addDays(startWindow, daysToSearch));

    // 1. Generate all possible 15-minute slots within business hours for the date range
    const rawSlots = generateRawSlots(startWindow, endWindow);

    // 2. Filter and score slots for each duration
    const fifteenMinSlots = processSlotsForDuration(rawSlots, 15, calendars);
    const thirtyMinSlots = processSlotsForDuration(rawSlots, 30, calendars);
    const sixtyMinSlots = processSlotsForDuration(rawSlots, 60, calendars);

    return {
        fifteenMinSlots: selectTop3WithDiversity(fifteenMinSlots),
        thirtyMinSlots: selectTop3WithDiversity(thirtyMinSlots),
        sixtyMinSlots: selectTop3WithDiversity(sixtyMinSlots)
    };
}

/**
 * Generates 15-minute interval slots for the search period, respecting business hours (8 AM - 6 PM)
 */
function generateRawSlots(start: Date, end: Date): Date[] {
    const slots: Date[] = [];
    let current = start;

    // Align to next 15 minute interval if not already
    const minutes = getMinutes(current);
    const remainder = minutes % 15;
    if (remainder !== 0) {
        current = addMinutes(current, 15 - remainder);
    }
    // Ensure second/millisecond is 0
    current.setSeconds(0, 0);

    // Limit to 7 days max to prevent infinite loops if end is far in future
    const maxDate = addDays(start, 8);
    const effectiveEnd = isBefore(end, maxDate) ? end : maxDate;

    while (isBefore(current, effectiveEnd)) {
        const hour = getHours(current);

        // Only include business hours (8 AM - 6 PM)
        // Note: A slot starting at 5:45 PM (17:45) is valid for 15 min, ending at 6:00 PM
        if (hour >= WORK_START_HOUR && hour < WORK_END_HOUR) {
            slots.push(new Date(current));
        } else if (hour < WORK_START_HOUR) {
            // Skip ahead to start of work day
            current = setMinutes(setHours(current, WORK_START_HOUR), 0);
            continue; // Continue loop with new time
        } else if (hour >= WORK_END_HOUR) {
            // Skip to next day morning
            current = addDays(startOfDay(current), 1);
            current = setMinutes(setHours(current, WORK_START_HOUR), 0);
            continue;
        }

        current = addMinutes(current, 15);
    }

    return slots;
}

/**
 * Checks availability and scores valid slots for a specific duration
 */
function processSlotsForDuration(
    startTimes: Date[],
    durationMinutes: number,
    calendars: UserCalendar[]
): TimeSlot[] {
    const validSlots: TimeSlot[] = [];

    for (const start of startTimes) {
        const end = addMinutes(start, durationMinutes);

        // Hard constraints:
        // 1. Must end by WORK_END_HOUR (6 PM)
        if (getHours(end) > WORK_END_HOUR || (getHours(end) === WORK_END_HOUR && getMinutes(end) > 0)) {
            continue; // Skip slots that go past work hours
        }

        // 2. Everyone must be free
        if (isSlotAvailable(start, end, calendars)) {
            const score = scoreTimeSlot(start, durationMinutes);
            validSlots.push({ start, end, score });
        }
    }

    // Sort by score descending
    return validSlots.sort((a, b) => b.score - a.score);
}

/**
 * Checks if a time range is free for all users
 */
function isSlotAvailable(start: Date, end: Date, calendars: UserCalendar[]): boolean {
    for (const user of calendars) {
        for (const event of user.events) {
            const eventStart = new Date(event.startTime);
            const eventEnd = new Date(event.endTime);

            // Check for overlap
            // Overlap occurs if (StartA < EndB) and (EndA > StartB)
            if (start < eventEnd && end > eventStart) {
                return false; // Collision found
            }
        }
    }
    return true;
}

/**
 * Scores a time slot based on various heuristics
 */
function scoreTimeSlot(start: Date, durationMinutes: number): number {
    let score = 100;
    const hour = getHours(start);
    const minute = getMinutes(start);
    const day = getDay(start); // 0 = Sun, 1 = Mon...

    // RULE 1: Prime time (10 AM - 4 PM)
    if (hour >= PRIME_START_HOUR && hour < PRIME_END_HOUR) {
        score += 50;
    } else if (hour >= WORK_START_HOUR + 1 && hour < WORK_END_HOUR - 1) { // 9-10 AM or 4-5 PM
        score += 20;
    } else {
        score -= 30; // Early/Late
    }

    // RULE 2: Sweet spots (Late Morning / Early Afternoon)
    if (hour === 10 || hour === 11) score += 20;
    if (hour === 14 || hour === 15) score += 15;

    // RULE 3: Avoid post-lunch slump
    if (hour === 13) score -= 10;

    // RULE 4: Day of week preferences
    if (day === 1 || day === 2) score += 10; // Mon/Tue
    if (day === 5) score -= 5; // Fri

    // RULE 5: Sooner is better
    const now = new Date();
    const diffDays = Math.floor((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (isSameDay(start, now)) score += 15;
    else if (diffDays === 1) score += 10;
    else if (diffDays <= 3) score += 5;
    else score -= (diffDays * 2);

    // RULE 6: Clean start times
    if (minute === 0) score += 10;
    else if (minute === 30) score += 5;

    return score;
}

/**
 * Selects top 3 unique slots with diversity heuristic
 */
function selectTop3WithDiversity(sortedSlots: TimeSlot[]): TimeSlot[] {
    const selected: TimeSlot[] = [];
    const usedHours = new Set<string>(); // "Day-Hour" e.g., "1-10" for Mon 10am

    for (const slot of sortedSlots) {
        if (selected.length >= 3) break;

        const day = getDay(slot.start);
        const hour = getHours(slot.start);
        const key = `${day}-${hour}`;

        // Try to avoid same hour on same day if we already have a suggestion
        // Unless we're desperate (running out of options), but basic logic for now:
        // If we have < 1 selected, take it.
        // If we have >= 1, skip if conflict.
        if (selected.length > 0 && usedHours.has(key)) {
            continue;
        }

        selected.push(slot);
        usedHours.add(key);
    }

    // Fallback: If we couldn't find 3 diverse ones, just fill with next best available
    // regardless of diversity, to ensure we show *something* (up to 3)
    if (selected.length < 3 && sortedSlots.length > selected.length) {
        for (const slot of sortedSlots) {
            if (selected.length >= 3) break;
            // Check if already included
            if (!selected.includes(slot)) {
                selected.push(slot);
            }
        }
    }

    return selected;
}
