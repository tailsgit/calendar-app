
import { areIntervalsOverlapping, max, min, parseISO } from 'date-fns';

export interface CalendarEvent {
    id: string;
    title: string;
    startTime: string | Date;
    endTime: string | Date;
    [key: string]: any; // Allow other properties
}

export interface ConflictGroup {
    type: 'conflict';
    id: string; // Unique ID for the group
    startTime: Date;
    endTime: Date;
    events: CalendarEvent[];
}

export type RenderableEvent = CalendarEvent | ConflictGroup;

/**
 * Groups overlapping events into ConflictBlocks.
 * Returns an array where items are either a single Event or a ConflictGroup.
 */
export function groupEventsForConflict(events: CalendarEvent[]): RenderableEvent[] {
    if (events.length === 0) return [];

    // 1. Sort by Start Time
    const sortedEvents = [...events].sort((a, b) => {
        const startA = new Date(a.startTime).getTime();
        const startB = new Date(b.startTime).getTime();
        return startA - startB;
    });

    const result: RenderableEvent[] = [];
    let currentOverlapGroup: CalendarEvent[] = [];

    // Initialize with first event
    currentOverlapGroup.push(sortedEvents[0]);

    for (let i = 1; i < sortedEvents.length; i++) {
        const currentEvent = sortedEvents[i];

        // Check if current event overlaps with the *entire group* so far
        // Simplification: identifying if it overlaps with the group's collective bounds
        // Actually, strictly speaking, if A overlaps B, and B overlaps C, but A doesn't overlap C,
        // they form a chain and should probably be visually grouped to avoid layout breaking, 
        // OR we just group simplistic overlaps. 
        // "Merging" implies a chain. Let's merge the chain.

        // Calculate current group's end time (max end time of events in group)
        const groupEndTime = new Date(Math.max(...currentOverlapGroup.map(e => new Date(e.endTime).getTime())));
        const currentEventStart = new Date(currentEvent.startTime);

        if (currentEventStart < groupEndTime) {
            // Overlap detected! Add to group.
            currentOverlapGroup.push(currentEvent);
        } else {
            // No overlap with the running group.
            // Flush the current group to result.
            pushGroupToResult(currentOverlapGroup, result);

            // Start new group
            currentOverlapGroup = [currentEvent];
        }
    }

    // Flush remaining
    if (currentOverlapGroup.length > 0) {
        pushGroupToResult(currentOverlapGroup, result);
    }

    return result;
}

function pushGroupToResult(group: CalendarEvent[], result: RenderableEvent[]) {
    if (group.length === 1) {
        // Single event, no conflict
        result.push(group[0]);
    } else {
        // Conflict Group
        const start = new Date(Math.min(...group.map(e => new Date(e.startTime).getTime())));
        const end = new Date(Math.max(...group.map(e => new Date(e.endTime).getTime())));

        result.push({
            type: 'conflict',
            id: `conflict-${group.map(e => e.id).join('-')}`,
            startTime: start,
            endTime: end,
            events: group
        });
    }
}
