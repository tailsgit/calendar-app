
import { groupEventsForConflict, CalendarEvent } from '../src/lib/conflict-detection';

function test() {
    console.log("Testing Conflict Grouping Logic...\n");

    const events: CalendarEvent[] = [
        // No Conflict
        { id: '1', title: 'Morning Coffee', startTime: '2025-10-10T09:00:00Z', endTime: '2025-10-10T09:30:00Z' },

        // Conflict Pair (10:00 - 11:00) overlapped by (10:30 - 11:30)
        { id: '2', title: 'Deep Work', startTime: '2025-10-10T10:00:00Z', endTime: '2025-10-10T11:00:00Z' },
        { id: '3', title: 'Surprise Meeting', startTime: '2025-10-10T10:30:00Z', endTime: '2025-10-10T11:30:00Z' },

        // Separate Event
        { id: '4', title: 'Lunch', startTime: '2025-10-10T12:00:00Z', endTime: '2025-10-10T13:00:00Z' },

        // Triple Conflict Chain (A overlaps B, B overlaps C)
        { id: '5', title: 'A', startTime: '2025-10-10T14:00:00Z', endTime: '2025-10-10T15:00:00Z' },
        { id: '6', title: 'B', startTime: '2025-10-10T14:30:00Z', endTime: '2025-10-10T15:30:00Z' },
        { id: '7', title: 'C', startTime: '2025-10-10T15:15:00Z', endTime: '2025-10-10T16:00:00Z' }
    ];

    const grouped = groupEventsForConflict(events);

    console.log(`Input Events: ${events.length}`);
    console.log(`Output Groups: ${grouped.length} (Expected: 3 groups + 1 single = 4?)`);
    // Wait, let's trace:
    // 1 (09:00-09:30) -> Single
    // 2 (10:00-11:00) + 3 (10:30-11:30) -> Group
    // 4 (12:00-13:00) -> Single
    // 5 (14:00-15:00) + 6 (14:30-15:30) + 7 (15:15-16:00) -> Group
    // Total should be 4 items in result array.

    grouped.forEach((item, idx) => {
        if ('type' in item && item.type === 'conflict') {
            console.log(`[Group ${idx}] CONFLICT detected! Contains ${item.events.length} events. Range: ${new Date(item.startTime).toISOString()} - ${new Date(item.endTime).toISOString()}`);
            item.events.forEach((e: CalendarEvent) => console.log(`  - ${e.title}`));
        } else {
            console.log(`[Group ${idx}] Single Event: ${(item as CalendarEvent).title}`);
        }
    });
}

test();
