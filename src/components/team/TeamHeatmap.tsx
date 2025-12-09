
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
    currentDate: Date; // Week start reference
}

interface BusySlot {
    startTime: string;
    endTime: string;
}

interface AvailabilityData {
    busy: BusySlot[];
    timeZone: string;
}

export default function TeamHeatmap({ selectedUsers, currentDate }: TeamHeatmapProps) {
    const [availabilityMap, setAvailabilityMap] = useState<Record<string, AvailabilityData>>({});
    const [loading, setLoading] = useState(false);
    const [goldenHours, setGoldenHours] = useState<TimeRange[]>([]);

    useEffect(() => {
        if (selectedUsers.length === 0) return;

        const fetchAvailability = async () => {
            setLoading(true);
            const start = startOfWeek(currentDate, { weekStartsOn: 1 });
            const end = addDays(start, 5);

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

                    // Calculate Golden Hours
                    const userTimezones = selectedUsers.map(u => ({
                        userId: u.id,
                        timezone: data[u.id]?.timeZone || 'UTC',
                        startHour: 9, // Default logic for now
                        endHour: 17
                    }));

                    // We calculate for the *current selected day* (or today if week view is broad? Let's verify Mon-Fri)
                    // For now, let's just calc for the first day of view to demo, or iterate all
                    const allGolden: TimeRange[] = [];
                    for (let i = 0; i < 5; i++) {
                        const dayDate = addDays(start, i);
                        const dailyGolden = findGoldenHours(userTimezones, dayDate);
                        allGolden.push(...dailyGolden);
                    }
                    setGoldenHours(allGolden);
                }
            } catch (error) {
                console.error("Failed to load heatmap", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAvailability();
    }, [selectedUsers, currentDate]);

    // Generate Grid Data
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 5 }, (_, i) => addDays(start, i)); // Mon-Fri
    const hours = Array.from({ length: 9 }, (_, i) => i + 9); // 9 AM - 5 PM (Business hours as requested)

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

    if (loading && Object.keys(availabilityMap).length === 0) {
        return (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#a3a3a3' }}>
                <Loader2 className="animate-spin mr-2" /> Loading team schedules...
            </div>
        );
    }

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
