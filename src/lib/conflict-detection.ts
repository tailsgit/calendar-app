
import { areIntervalsOverlapping, max, min, parseISO } from 'date-fns';

export interface CalendarEvent {
    id: string;
    title: string;
    startTime: string | Date;
    endTime: string | Date;
    [key: string]: any; // Allow other properties
}

/**
 * Calculates layout styles (left, width) for events, handling visual overlaps.
 * Accounts for 20px minimum height.
 */
export function calculateEventLayout(events: CalendarEvent[]): Map<string, { left: string, width: string, zIndex: number }> {
    const layoutMap = new Map<string, { left: string, width: string, zIndex: number }>();
    if (events.length === 0) return layoutMap;

    // 1. Sort by Start Time, then End Time (longest first)
    const sortedEvents = [...events].sort((a, b) => {
        const startDiff = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        if (startDiff !== 0) return startDiff;
        return new Date(b.endTime).getTime() - new Date(a.endTime).getTime();
    });

    // 2. Expand "Visual End Time"
    // Events have a minimum visual height of 20px (20 minutes)
    const visualEvents = sortedEvents.map(e => {
        const start = new Date(e.startTime).getTime();
        const rawEnd = new Date(e.endTime).getTime();
        const minEnd = start + (20 * 60 * 1000);
        const end = Math.max(rawEnd, minEnd);
        return { ...e, start, end };
    });

    const columns: any[][] = [];
    let lastEventEnd: number | null = null;

    visualEvents.forEach((event) => {
        if (lastEventEnd !== null && event.start >= lastEventEnd) {
            packEvents(columns, layoutMap);
            columns.length = 0;
            lastEventEnd = null;
        }

        let placed = false;
        for (const col of columns) {
            if (col[col.length - 1].end <= event.start) {
                col.push(event);
                placed = true;
                break;
            }
        }

        if (!placed) {
            columns.push([event]);
        }

        if (lastEventEnd === null || event.end > lastEventEnd) {
            lastEventEnd = event.end;
        }
    });

    if (columns.length > 0) {
        packEvents(columns, layoutMap);
    }

    return layoutMap;
}

function packEvents(columns: any[][], layoutMap: Map<string, { left: string, width: string, zIndex: number }>) {
    const numColumns = columns.length;
    const width = 100 / numColumns;

    columns.forEach((col, i) => {
        col.forEach((event) => {
            // Basic side-by-side
            layoutMap.set(event.id, {
                left: `${i * width}%`,
                width: `${width}%`,
                zIndex: i + 1
            });
        });
    });
}

