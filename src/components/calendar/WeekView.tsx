"use client";

import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import EventCard from './EventCard';
import { calculateEventLayout } from '@/lib/conflict-detection';

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  color: string;
  isLunch?: boolean;
}

interface WeekViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick?: (event: Event) => void;
  onTimeSlotClick?: (date: Date, hour: number) => void;
  onConflictClick?: (group: any) => void;
  onDayContextMenu?: (e: React.MouseEvent, date: Date) => void;
  onEventContextMenu?: (e: React.MouseEvent, event: Event) => void;
}

export default function WeekView({ currentDate, events, onEventClick, onTimeSlotClick, onConflictClick, onDayContextMenu, onEventContextMenu }: WeekViewProps) {
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  const hours = Array.from({ length: 17 }, (_, i) => i + 7); // 7 AM - 11 PM (07:00 - 23:00)

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(new Date(event.startTime), day));
  };

  return (
    <div className="week-view">
      <div className="week-header">
        <div className="time-column-header"></div>
        {weekDays.map((day) => (
          <div
            key={day.toString()}
            className={`day-header ${isSameDay(day, new Date()) ? 'today' : ''}`}
            onContextMenu={(e) => {
              e.preventDefault();
              onDayContextMenu?.(e, day);
            }}
          >
            <div className="day-name">{format(day, 'EEE')}</div>
            <div className="day-number">{format(day, 'd')}</div>
          </div>
        ))}
      </div>

      <div className="week-grid">
        <div className="time-column">
          {hours.map((hour) => (
            <div key={hour} className="time-slot-label">
              {format(new Date().setHours(hour, 0), 'h a')}
            </div>
          ))}
        </div>

        <div className="days-grid" style={{ display: 'flex', flexDirection: 'row' }}>
          {weekDays.map((day) => {
            const dayEvents = getEventsForDay(day);
            const layoutMap = calculateEventLayout(dayEvents); // Calculate layout once per day

            return (
              <div
                key={day.toString()}
                className="day-column"
                style={{ flex: 1 }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onDayContextMenu?.(e, day);
                }}
              >
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="time-slot"
                    style={{
                      height: '60px',
                      borderBottom: '1px solid var(--color-border)',
                      borderRight: '1px solid var(--color-border)',
                      position: 'relative'
                    }}
                    onClick={() => onTimeSlotClick?.(day, hour)}
                  >
                    {dayEvents
                      .filter((event) => {
                        const start = new Date(event.startTime);
                        return start.getHours() === hour;
                      })
                      .map((event) => {
                        const layout = layoutMap.get(event.id) || { left: '0%', width: '100%', zIndex: 1 };
                        return (
                          <EventCard
                            key={event.id}
                            title={event.title}
                            startTime={new Date(event.startTime)}
                            endTime={new Date(event.endTime)}
                            color="var(--color-accent)"
                            isLunch={event.isLunch}
                            onClick={() => onEventClick?.(event)}
                            onContextMenu={(e) => onEventContextMenu?.(e, event)}
                            top={new Date(event.startTime).getMinutes()} // Relative to hour slot
                            left={layout.left}
                            width={layout.width}
                            zIndex={layout.zIndex}
                          />
                        );
                      })}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>


      <style jsx>{`
        .week-view {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 200px);
          border: 1px solid var(--color-border); /* Variable */
          border-radius: var(--radius-lg);
          background-color: var(--color-bg-secondary); /* Grid Background use Secondary (Dark=Black, Light=Slate) */
          overflow: hidden;
        }

        .week-header {
          display: flex;
          border-bottom: 1px solid var(--color-border); /* Variable */
          background-color: var(--color-bg-main); /* Header Background (Surface) */
        }

        .time-column-header {
          width: 60px;
          flex-shrink: 0;
          border-right: 1px solid var(--color-border); /* Variable */
          background-color: var(--color-bg-main); /* Header Background (Surface) */
        }

        .day-header {
          flex: 1;
          text-align: center;
          padding: var(--spacing-sm);
          border-right: 1px solid var(--color-border);
          background-color: var(--color-bg-main); /* Header Background (Surface) */
        }

        .day-header:last-child {
          border-right: none;
        }

        .day-header.today {
          background-color: rgba(99, 102, 241, 0.1);
        }

        .day-header.today .day-number {
          background-color: var(--color-accent);
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .day-name {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .day-number {
          font-size: 1.2rem;
          font-weight: bold;
        }

        .week-grid {
          display: flex;
          flex: 1;
          overflow-y: auto;
        }

        .time-column {
          width: 60px;
          flex-shrink: 0;
          border-right: 1px solid var(--color-border);
        }

        .time-slot-label {
          height: 60px;
          display: flex;
          align-items: start;
          justify-content: center;
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          padding-top: 8px;
        }

        .days-grid {
          flex: 1;
          position: relative;
        }

        .hour-row {
          display: flex;
          height: 60px;
          border-bottom: 1px solid var(--color-border);
        }

        .hour-row:last-child {
          border-bottom: none;
        }
      `}</style>
    </div>
  );
}
