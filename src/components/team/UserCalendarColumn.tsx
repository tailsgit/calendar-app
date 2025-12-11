"use client";

import { format, startOfWeek, addDays, isSameDay } from 'date-fns';

interface User {
    id: string;
    name: string;
    image: string | null;
    title: string | null;
    department: string | null;
    status: string;
    timeZone?: string; // Add optional timeZone
}

import { toZonedTime } from 'date-fns-tz';
import { Clock } from 'lucide-react';

interface Event {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    color?: string;
    isLunch?: boolean;
}

interface UserCalendarColumnProps {
    user: User;
    events: Event[];
    currentDate: Date;
    columnCount: number; // 1, 2, 3, or 4
    onSlotClick?: (startTime: Date) => void;
    onContextMenu?: (e: React.MouseEvent, startTime: Date) => void;
}

export default function UserCalendarColumn({ user, events, currentDate, columnCount, onSlotClick, onContextMenu }: UserCalendarColumnProps) {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    // For 3-4 people, we might show fewer days, but for now let's try to show 5 days (Mon-Fri)
    // and let CSS handle the compression/scrolling.
    const weekDays = Array.from({ length: 5 }, (_, i) => addDays(startDate, i));
    const hours = Array.from({ length: 17 }, (_, i) => i + 7); // 7 AM - 11 PM

    // Calculate dynamic styles based on column count
    const isCompact = columnCount >= 3;
    const showTitle = columnCount <= 2;

    return (
        <div className="user-calendar-column">
            <div className="column-header">
                <div className="user-info">
                    <div className="avatar">
                        {user.image ? (
                            <img src={user.image} alt="" />
                        ) : (
                            <div className="initial">{user.name.charAt(0)}</div>
                        )}
                        <div className={`status-dot ${user.status}`} />
                    </div>
                    <div className="details">
                        <div className="name">{user.name}</div>
                        {showTitle && (
                            <div className="meta">
                                {user.title} {user.department && `· ${user.department}`}
                            </div>
                        )}
                    </div>
                    {user.timeZone && (
                        <div className="flex items-center text-[10px] text-neutral-500 mt-0.5">
                            <Clock size={10} className="mr-1" />
                            {format(toZonedTime(new Date(), user.timeZone), 'h:mm a')}
                        </div>
                    )}
                </div>
            </div>

            <div className="calendar-grid">
                <div className="days-header-row">
                    <div className="time-gutter-header" />
                    {weekDays.map(day => (
                        <div key={day.toString()} className={`day-header ${isSameDay(day, new Date()) ? 'today' : ''}`}>
                            <span className="day-name">{format(day, 'EEE')}</span>
                            {!isCompact && <span className="day-num">{format(day, 'd')}</span>}
                        </div>
                    ))}
                </div>

                <div className="grid-body">
                    {hours.map(hour => (
                        <div key={hour} className="hour-row">
                            <div className="time-label">
                                {format(new Date().setHours(hour, 0), 'h')}
                            </div>
                            {weekDays.map(day => (
                                <div
                                    key={day.toString()}
                                    className={`time-slot ${onSlotClick ? 'interactive' : ''}`}
                                    onClick={() => {
                                        if (onSlotClick) {
                                            const slotTime = new Date(day);
                                            slotTime.setHours(hour, 0, 0, 0);
                                            onSlotClick(slotTime);
                                        }
                                    }}
                                    onContextMenu={(e) => {
                                        if (onContextMenu) {
                                            const slotTime = new Date(day);
                                            slotTime.setHours(hour, 0, 0, 0);
                                            onContextMenu(e, slotTime);
                                        }
                                    }}
                                >
                                    {events.filter(event =>
                                        isSameDay(new Date(event.startTime), day) &&
                                        new Date(event.startTime).getHours() === hour
                                    ).map(event => (
                                        <div
                                            key={event.id}
                                            className="mini-event"
                                            style={{
                                                backgroundColor: 'var(--color-accent)',
                                                opacity: new Date(event.endTime) < new Date() ? 0.25 : (event.isLunch ? 0.65 : 1)
                                            }}
                                            title={`${event.title} (${format(new Date(event.startTime), 'h:mm')} - ${format(new Date(event.endTime), 'h:mm')})`}
                                        >
                                            {!isCompact && event.title}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
                .user-calendar-column {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: var(--color-bg-main);
                    border-right: 2px solid #cbd5e1; /* Thicker, darker border for clear separation */
                    min-width: 0; /* Allow shrinking */
                }

                .user-calendar-column:last-child {
                    border-right: none;
                }

                .column-header {
                    padding: var(--spacing-md);
                    border-bottom: 1px solid var(--color-border);
                    background: var(--color-bg-secondary);
                    height: 70px;
                    display: flex;
                    align-items: center;
                }

                .user-info {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    overflow: hidden;
                }

                .avatar {
                    position: relative;
                    width: ${isCompact ? '32px' : '40px'};
                    height: ${isCompact ? '32px' : '40px'};
                    flex-shrink: 0;
                }

                .avatar img, .initial {
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    object-fit: cover;
                }

                .initial {
                    background: var(--color-accent);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: ${isCompact ? '0.9rem' : '1.2rem'};
                }

                .status-dot {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    border: 2px solid var(--color-bg-secondary);
                }

                .status-dot.available { background: var(--color-success); }
                .status-dot.busy { background: var(--color-error); }
                .status-dot.away { background: var(--color-warning); }

                .details {
                    overflow: hidden;
                }

                .name {
                    font-weight: 600;
                    font-size: ${isCompact ? '0.9rem' : '1rem'};
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .meta {
                    font-size: 0.75rem;
                    color: var(--color-text-secondary);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .calendar-grid {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .days-header-row {
                    display: flex;
                    border-bottom: 1px solid var(--color-border);
                    background: var(--color-bg-main);
                }

                .time-gutter-header {
                    width: ${isCompact ? '30px' : '50px'};
                    flex-shrink: 0;
                    border-right: 1px solid var(--color-border);
                }

                .day-header {
                    flex: 1;
                    text-align: center;
                    padding: 4px 0;
                    border-right: 1px solid var(--color-border);
                    font-size: 0.75rem;
                }

                .day-header:last-child {
                    border-right: none;
                }

                .day-header.today {
                    background: rgba(99, 102, 241, 0.1); /* Indigo tint */
                    color: var(--color-accent);
                    font-weight: 600;
                }

                .grid-body {
                    flex: 1;
                    overflow-y: auto;
                }

                .hour-row {
                    display: flex;
                    height: 50px; /* Fixed height for alignment */
                    border-bottom: 1px solid var(--color-border);
                }

                .time-label {
                    width: ${isCompact ? '30px' : '50px'};
                    flex-shrink: 0;
                    text-align: right;
                    padding-right: 4px;
                    font-size: 0.7rem;
                    color: var(--color-text-secondary);
                    border-right: 1px solid var(--color-border);
                    display: flex;
                    align-items: start;
                    justify-content: flex-end;
                    padding-top: 4px;
                }

                .time-slot {
                    flex: 1;
                    border-right: 1px solid var(--color-border);
                    position: relative;
                    padding: 1px;
                }

                .time-slot:last-child {
                    border-right: none;
                }

                .time-slot:hover {
                    background-color: rgba(0,0,0,0.02);
                }

                .time-slot.interactive {
                    cursor: pointer;
                }
                .time-slot.interactive:hover {
                    background-color: rgba(79, 70, 229, 0.1); /* Indigo tint for hover */
                }

                .mini-event {
                    font-size: 0.65rem;
                    color: white;
                    padding: 2px 4px;
                    border-radius: 2px;
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                    height: 100%;
                    opacity: 0.9;
                }
            `}</style>
        </div>
    );
}
