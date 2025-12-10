
"use client";

import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, addHours, isBefore, isAfter, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Loader2, Clock } from 'lucide-react';
import { findGoldenHours, TimeRange } from '@/lib/timezones';

interface User {
    id: string;
    name: string;
}

interface TeamHeatmapProps {
    selectedUsers: User[];
    currentDate: Date;
    timeView: 'week' | 'month';
}

interface BusySlot {
    startTime: string;
    endTime: string;
}

interface AvailabilityData {
    busy: BusySlot[];
    timeZone: string;
}

export default function TeamHeatmap({ selectedUsers, currentDate, timeView }: TeamHeatmapProps) {
    const [availabilityMap, setAvailabilityMap] = useState<Record<string, AvailabilityData>>({});
    const [loading, setLoading] = useState(false);
    const [goldenHours, setGoldenHours] = useState<TimeRange[]>([]);

    useEffect(() => {
        if (selectedUsers.length === 0) return;

        const fetchAvailability = async () => {
            setLoading(true);
            let start, end;

            if (timeView === 'month') {
                const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                start = startOfWeek(monthStart, { weekStartsOn: 1 });
                const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                end = addDays(monthEnd, 7); // Buffer
            } else {
                start = startOfWeek(currentDate, { weekStartsOn: 1 });
                end = addDays(start, 5); // Mon-Fri
            }

            try {
                const res = await fetch('/api/team/availability', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userIds: selectedUsers.map(u => u.id),
                        start: start.toISOString(),
                        end: end.toISOString()
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    setAvailabilityMap(data);
                    // Golden hours calculation omitted for brevity/optimization in month view
                }
            } catch (error) {
                console.error("Failed to load heatmap", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAvailability();
    }, [selectedUsers, currentDate, timeView]);

    // Helpers
    const getSlotStatus = (date: Date, hour: number) => {
        const slotStart = new Date(date);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = addHours(slotStart, 1);

        const busyUsers = selectedUsers.filter(user => {
            const data = availabilityMap[user.id];
            if (!data) return false;

            return data.busy.some(busy => {
                const busyStart = new Date(busy.startTime);
                const busyEnd = new Date(busy.endTime);
                return (slotStart < busyEnd && slotEnd > busyStart);
            });
        });

        return {
            total: selectedUsers.length,
            busyCount: busyUsers.length,
            busyNames: busyUsers.map(u => u.name)
        };
    };

    // Month View Helper: Calculate daily availability score (0-1)
    const getDailyScore = (date: Date) => {
        // Business hours 9-5 (8 hours)
        let freeSlots = 0;
        const totalSlots = 8;

        for (let h = 9; h < 17; h++) {
            const status = getSlotStatus(date, h);
            if (status.busyCount === 0) freeSlots++;
        }

        return freeSlots / totalSlots;
    };

    if (loading && Object.keys(availabilityMap).length === 0) {
        return (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#a3a3a3' }}>
                <Loader2 className="animate-spin mr-2" /> Loading team schedules...
            </div>
        );
    }

    // Render Month View
    if (timeView === 'month') {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const start = startOfWeek(monthStart, { weekStartsOn: 1 });
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        // Generate complete grid 6 weeks max
        const gridDays = [];
        let day = start;
        while (gridDays.length < 35 || day <= monthEnd) {
            gridDays.push(day);
            day = addDays(day, 1);
        }

        return (
            <div className="heatmap-container-month" style={{
                backgroundColor: 'var(--color-bg-main)',
                borderRadius: '12px',
                border: '1px solid var(--color-border)',
                padding: '24px',
                height: '100%',
                display: 'flex', flexDirection: 'column'
            }}>
                {/* Legend */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}><div style={{ width: 12, height: 12, backgroundColor: 'var(--color-heatmap-free)', borderRadius: 2, marginRight: 6 }}></div> High Availability</div>
                    <div style={{ display: 'flex', alignItems: 'center' }}><div style={{ width: 12, height: 12, backgroundColor: '#fde047', borderRadius: 2, marginRight: 6 }}></div> Medium</div>
                    <div style={{ display: 'flex', alignItems: 'center' }}><div style={{ width: 12, height: 12, backgroundColor: 'var(--color-heatmap-busy)', borderRadius: 2, marginRight: 6 }}></div> Low/Busy</div>
                </div>

                <div className="month-heatmap-grid" style={{
                    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px',
                    backgroundColor: 'var(--color-border)', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', flex: 1
                }}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                        <div key={d} style={{ background: 'var(--color-bg-secondary)', padding: '8px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{d}</div>
                    ))}
                    {gridDays.map((d, i) => {
                        const isCurrentMonth = d.getMonth() === currentDate.getMonth();
                        if (!isCurrentMonth) {
                            return <div key={i} style={{ background: 'var(--color-bg-secondary)', opacity: 0.5, minHeight: '80px' }} />;
                        }

                        const score = getDailyScore(d);
                        let bg = 'var(--color-bg-main)';
                        if (score >= 0.75) bg = 'var(--color-heatmap-free)'; // Green
                        else if (score >= 0.3) bg = '#fde047'; // Yellow
                        else if (score >= 0) bg = 'var(--color-heatmap-busy)'; // Red (if 0 free slots)
                        else bg = 'var(--color-bg-secondary)'; // No data?

                        return (
                            <div key={i} style={{
                                background: bg,
                                minHeight: '80px',
                                padding: '4px',
                                display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                                opacity: 0.9, transition: 'opacity 0.2s', cursor: 'pointer'
                            }} title={`Availability Score: ${Math.round(score * 100)}%`}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: score > 0.5 ? 'white' : 'var(--color-text-main)' }}>{format(d, 'd')}</span>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: score > 0.5 ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.6)' }}>
                                        {Math.round(score * 100)}%
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    // Generate Week Grid Data
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 5 }, (_, i) => addDays(start, i)); // Mon-Fri
    const hours = Array.from({ length: 9 }, (_, i) => i + 9); // 9 AM - 5 PM

    return (
        <div className="heatmap-container" style={{
            backgroundColor: 'var(--color-bg-main)',
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
            padding: '24px',
            overflowX: 'auto'
        }}>
            {/* Legend / Key */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}><div style={{ width: 12, height: 12, backgroundColor: 'var(--color-heatmap-free)', borderRadius: 2, marginRight: 6 }}></div> Free</div>
                <div style={{ display: 'flex', alignItems: 'center' }}><div style={{ width: 12, height: 12, backgroundColor: 'var(--color-heatmap-busy)', borderRadius: 2, marginRight: 6 }}></div> Busy</div>
            </div>

            {/* CSS Grid Container */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '60px repeat(5, 1fr)', // Time label + 5 Days
                gap: '1px',
                backgroundColor: 'var(--color-border)', // Gap color (border color logic)
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                overflow: 'hidden'
            }}>
                {/* Header Row */}
                <div style={{ backgroundColor: 'var(--color-bg-secondary)' }}></div> {/* Empty corner */}
                {days.map(day => (
                    <div key={day.toString()} style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontSize: '14px',
                        fontWeight: 600,
                        backgroundColor: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-main)'
                    }}>
                        {format(day, 'EEE')}
                    </div>
                ))}

                {/* Hour Rows */}
                {hours.map(hour => (
                    <div key={`row-${hour}`} style={{ display: 'contents' }}>
                        {/* Time Label */}
                        <div style={{
                            padding: '12px',
                            textAlign: 'right',
                            fontSize: '11px',
                            color: 'var(--color-text-secondary)',
                            backgroundColor: 'var(--color-bg-main)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            fontWeight: 500
                        }}>
                            {format(new Date().setHours(hour, 0), 'h a')}
                        </div>

                        {/* Day Cells */}
                        {days.map(day => {
                            const status = getSlotStatus(day, hour);
                            const isAllFree = status.busyCount === 0;
                            const isBusy = status.busyCount > 0;

                            // Color Logic
                            let backgroundColor = 'var(--color-bg-main)'; // Default/Unknown
                            if (isAllFree) backgroundColor = 'var(--color-heatmap-free)';
                            if (isBusy) backgroundColor = 'var(--color-heatmap-busy)';

                            return (
                                <div
                                    key={`cell-${day}-${hour}`}
                                    className="heatmap-cell"
                                    style={{
                                        position: 'relative',
                                        height: '48px',
                                        backgroundColor: backgroundColor,
                                        opacity: isBusy ? 0.8 : (isAllFree ? 1 : 0.5), // Adjust opacity for non-busy slots if needed
                                        cursor: 'pointer',
                                        transition: 'filter 0.2s',
                                    }}
                                >
                                    {/* Tooltip Content (Hidden by default, shown on hover via CSS) */}
                                    <div className="tooltip">
                                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                            {format(new Date().setHours(hour, 0), 'h:mm a')}
                                        </div>
                                        {isAllFree ? (
                                            <div style={{ color: 'var(--color-heatmap-free)' }}>✨ Perfect Match</div>
                                        ) : (
                                            <div>
                                                <div style={{ color: '#ff8787', marginBottom: 2 }}>Conflict:</div>
                                                {status.busyNames.map(name => (
                                                    <div key={name}>• {name}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            <style jsx>{`
                .heatmap-cell:hover {
                    filter: brightness(0.95);
                    z-index: 10;
                }
                .tooltip {
                    display: none;
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #1f2937;
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 11px;
                    white-space: nowrap;
                    z-index: 50;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    pointer-events: none;
                }
                .heatmap-cell:hover .tooltip {
                    display: block;
                }
                .tooltip::after {
                    content: '';
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    margin-left: -4px;
                    border-width: 4px;
                    border-style: solid;
                    border-color: #1f2937 transparent transparent transparent;
                }
            `}</style>
        </div>
    );
}
