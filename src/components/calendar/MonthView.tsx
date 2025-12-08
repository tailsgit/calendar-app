"use client";

import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from 'date-fns';

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  color: string;
  isLunch?: boolean;
}

interface MonthViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick?: (event: Event) => void;
  onDateClick?: (date: Date) => void;
}

export default function MonthView({ currentDate, events, onEventClick, onDateClick }: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      return isSameDay(eventDate, date);
    });
  };

  return (
    <div className="month-view">
      <div className="month-header">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="day-label">{day}</div>
        ))}
      </div>

      <div className="month-grid">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="week-row">
            {week.map(date => {
              const dayEvents = getEventsForDay(date);
              const isCurrentMonth = isSameMonth(date, currentDate);
              const isToday = isSameDay(date, new Date());

              return (
                <div
                  key={date.toISOString()}
                  className={`day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                  onClick={() => onDateClick?.(date)}
                >
                  <span className="date-number">{format(date, 'd')}</span>
                  <div className="day-events">
                    {dayEvents.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        className="event-dot"
                        style={{
                          backgroundColor: 'var(--color-accent)',
                          opacity: new Date(event.endTime) < new Date() ? 0.25 : (event.isLunch ? 0.65 : 1)
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(event);
                        }}
                        title={event.title}
                      >
                        <span className="event-title">{event.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="more-events">+{dayEvents.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <style jsx>{`
        .month-view {
          background: var(--color-bg-main);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          overflow: hidden;
        }

        .month-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          background: var(--color-bg-secondary);
          border-bottom: 1px solid var(--color-border);
        }

        .day-label {
          padding: var(--spacing-sm) var(--spacing-md);
          text-align: center;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
        }

        .month-grid {
          display: flex;
          flex-direction: column;
        }

        .week-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          min-height: 100px;
        }

        .day-cell {
          border-right: 1px solid var(--color-border);
          border-bottom: 1px solid var(--color-border);
          padding: var(--spacing-xs);
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }

        .day-cell:hover {
          background-color: var(--color-bg-secondary);
        }

        .day-cell:last-child {
          border-right: none;
        }

        .day-cell.other-month {
          background-color: var(--color-bg-secondary);
          opacity: 0.5;
        }

        .day-cell.today .date-number {
          background-color: var(--color-accent);
          color: white;
          border-radius: 50%;
          padding: 2px 6px;
        }

        .date-number {
          font-size: 0.85rem;
          font-weight: 500;
        }

        .day-events {
          margin-top: var(--spacing-xs);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .event-dot {
          font-size: 0.7rem;
          color: white;
          padding: 2px 4px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          cursor: pointer;
        }

        .more-events {
          font-size: 0.7rem;
          color: var(--color-text-secondary);
        }

        @media (max-width: 768px) {
          .week-row {
            min-height: 60px;
          }

          .event-dot .event-title {
            display: none;
          }

          .event-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
}
