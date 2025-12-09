"use client";

import { format, addHours, startOfDay, isSameDay } from 'date-fns';
import EventCard from './EventCard';
import { calculateEventLayout } from '@/lib/conflict-detection';

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  color: string;
  description?: string;
  locationType?: string;
}

interface DayViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick?: (event: Event) => void;
  onTimeSlotClick?: (date: Date, hour: number) => void;
}

export default function DayView({ currentDate, events, onEventClick, onTimeSlotClick }: DayViewProps) {
  const hours = Array.from({ length: 17 }, (_, i) => i + 7); // 7 AM - 11 PM
  const dayStart = startOfDay(currentDate);

  const dayEvents = events.filter(event => isSameDay(new Date(event.startTime), currentDate));
  const layoutMap = calculateEventLayout(dayEvents);

  return (
    <div className="day-view">
      <div className="day-header">
        <div className="day-info">
          <span className="day-name">{format(currentDate, 'EEEE')}</span>
          <span className="day-date">{format(currentDate, 'MMMM d, yyyy')}</span>
        </div>
      </div>

      <div className="day-grid">
        {hours.map(hour => {
          const time = addHours(dayStart, hour);
          const slotEvents = dayEvents.filter(e => new Date(e.startTime).getHours() === hour);

          return (
            <div key={hour} className="hour-row">
              <div className="hour-label">
                {format(time, 'h a')}
              </div>
              <div
                className="hour-slot"
                onClick={() => onTimeSlotClick?.(currentDate, hour)}
              >
                {slotEvents.map(event => {
                  const layout = layoutMap.get(event.id) || { left: '0%', width: '100%', zIndex: 1 };
                  return (
                    <EventCard
                      key={event.id}
                      title={event.title}
                      startTime={new Date(event.startTime)}
                      endTime={new Date(event.endTime)}
                      color={event.color}
                      onClick={() => onEventClick?.(event)}
                      top={new Date(event.startTime).getMinutes()}
                      left={layout.left}
                      width={layout.width}
                      zIndex={layout.zIndex}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .day-view {
          background: var(--color-bg-main);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          overflow: hidden;
        }

        .day-header {
          padding: var(--spacing-lg);
          border-bottom: 1px solid var(--color-border);
          background: var(--color-bg-main);
        }

        .day-info {
          display: flex;
          flex-direction: column;
        }

        .day-name {
          font-size: 1.25rem;
          font-weight: 600;
        }

        .day-date {
          color: var(--color-text-secondary);
          font-size: 0.9rem;
        }

        .day-grid {
          max-height: calc(100vh - 300px);
          overflow-y: auto;
        }

        .hour-row {
          display: flex;
          border-bottom: 1px solid var(--color-border);
          min-height: 60px;
        }

        .hour-label {
          width: 80px;
          padding: var(--spacing-sm);
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          text-align: right;
          border-right: 1px solid var(--color-border);
          flex-shrink: 0;
        }

        .hour-slot {
          flex: 1;
          padding: var(--spacing-xs);
          cursor: pointer;
          position: relative;
        }

        .hour-slot:hover {
          background-color: rgba(74, 144, 226, 0.05);
        }

        .day-event {
          background-color: var(--color-accent);
          color: white;
          padding: var(--spacing-sm);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-xs);
          cursor: pointer;
          overflow: hidden;
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
        }

        .day-event:hover {
          transform: translateX(4px);
          box-shadow: var(--shadow-md);
        }

        .event-time {
          font-size: 0.75rem;
          opacity: 0.9;
          margin-bottom: 2px;
        }

        .event-title {
          font-weight: 500;
          font-size: 0.9rem;
        }

        .event-location {
          font-size: 0.75rem;
          opacity: 0.9;
          margin-top: 4px;
        }

        @media (max-width: 768px) {
          .hour-label {
            width: 50px;
            font-size: 0.7rem;
          }
        }
      `}</style>
    </div>
  );
}
