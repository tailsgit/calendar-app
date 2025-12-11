import { format, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth } from 'date-fns';

interface User {
    id: string;
    name: string;
    image: string | null;
}

interface CalendarEvent {
    id: string;
    title: string;
    startTime: string | Date;
    endTime: string | Date;
    color?: string | null;
}

interface UserMonthCalendarProps {
    user: User;
    events: CalendarEvent[];
    currentDate: Date;
    onSlotClick?: (date: Date) => void;
    hoveredDate?: Date | null;
    onDateHover?: (date: Date | null) => void;
}

export default function UserMonthCalendar({ user, events, currentDate, onSlotClick, hoveredDate, onDateHover }: UserMonthCalendarProps) {
    // ... (existing code for dates)
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const calendarDays = [];
    let day = startDate;
    while (day <= endDate) {
        calendarDays.push(day);
        day = addDays(day, 1);
    }

    const isHovered = (date: Date) => {
        if (!hoveredDate) return false;
        return isSameDay(date, hoveredDate);
    };

    return (
        <div className="user-month-calendar h-full flex flex-col">
            <div className="user-header mb-2 flex items-center gap-2">
                <div className="user-avatar-sm" style={{ background: '#6366F1' }}>
                    {user.image ? <img src={user.image} alt="" /> : user.name[0]}
                </div>
                <span className="font-semibold text-sm">{user.name}</span>
            </div>

            <div className="month-grid flex-1">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => (
                    <div key={d} className="month-header-cell">{d}</div>
                ))}

                {calendarDays.map((date, idx) => {
                    const isCurrentMonth = isSameMonth(date, monthStart);
                    const isToday = isSameDay(date, new Date());
                    const isSyncHover = isHovered(date);

                    // Filter events for this day
                    const dayEvents = events.filter(e => isSameDay(new Date(e.startTime), date));
                    dayEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

                    return (
                        <div
                            key={idx}
                            className={`month-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'is-today' : ''} ${isSyncHover ? 'hover-sync' : ''}`}
                            onClick={() => {
                                if (onSlotClick) {
                                    // Default to 9 AM for month view clicks
                                    const clickDate = new Date(date);
                                    clickDate.setHours(9, 0, 0, 0);
                                    onSlotClick(clickDate);
                                }
                            }}
                            onMouseEnter={() => onDateHover?.(date)}
                            onMouseLeave={() => onDateHover?.(null)}
                            style={{ cursor: onSlotClick ? 'pointer' : 'default' }}
                        >
                            <div className="month-date-label">{format(date, 'd')}</div>
                            <div className="month-cell-content">
                                {dayEvents.slice(0, 3).map((event, i) => (
                                    <div key={i} className="month-event-pill" title={event.title} style={{ borderLeftColor: event.color || '#6366F1' }}>
                                        <span className="event-time">{format(new Date(event.startTime), 'HH:mm')}</span>
                                        <span className="event-title">{event.title}</span>
                                    </div>
                                ))}
                                {dayEvents.length > 3 && (
                                    <div className="more-count">+{dayEvents.length - 3}</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <style jsx>{`
                .user-avatar-sm {
                    width: 24px; height: 24px; border-radius: 50%; 
                    color: white; display: flex; align-items: center; justify-content: center;
                    font-size: 0.75rem; overflow: hidden;
                }
                .user-avatar-sm img { width: 100%; height: 100%; object-fit: cover; }
                
                .month-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    /* Auto rows to fill height effectively or min-height */
                    grid-auto-rows: minmax(80px, 1fr); 
                    background: var(--color-border);
                    gap: 1px;
                    border: 1px solid var(--color-border);
                    border-radius: 8px;
                    overflow: hidden;
                }

                .month-header-cell {
                    background: var(--color-bg-secondary);
                    padding: 4px;
                    text-align: center;
                    font-weight: 600;
                    font-size: 0.75rem;
                    color: var(--color-text-secondary);
                }

                .month-cell {
                    background: var(--color-bg-main);
                    padding: 2px;
                    display: flex; flex-direction: column;
                    min-height: 0; /* Allow shrinking in flex container */
                }
                
                .other-month { background: var(--color-bg-secondary); opacity: 0.5; }
                .is-today { background: var(--color-bg-highlight); }
                .hover-sync { background-color: rgba(79, 70, 229, 0.1); }

                .month-date-label {
                    text-align: right;
                    font-size: 0.7rem;
                    color: var(--color-text-secondary);
                    margin-bottom: 2px;
                    padding-right: 2px;
                }

                .month-cell-content {
                    flex: 1;
                    display: flex; flex-direction: column; gap: 2px;
                    overflow-y: hidden; /* Hide overflow to prevent layout blowouts */
                }

                .month-event-pill {
                    font-size: 0.65rem;
                    background: var(--color-bg-secondary);
                    padding: 1px 2px;
                    border-radius: 2px;
                    border-left-width: 2px;
                    border-left-style: solid;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    display: flex; gap: 4px;
                }
                .event-time { color: var(--color-text-tertiary); display: none; /* Hide time on small cards? OR keep if space */ }
                @media (min-width: 1200px) {
                    .event-time { display: inline; }
                }
                
                .more-count {
                    font-size: 0.65rem;
                    color: var(--color-text-tertiary);
                    text-align: center;
                }
            `}</style>
        </div>
    );
}
