"use client";

import { format } from 'date-fns';
import { Mic } from 'lucide-react';

type ViewMode = 'day' | 'week' | 'month';

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
  onDateChange: (date: Date) => void;
  onToday: () => void;
  onNewMeeting: () => void;
}

export default function CalendarHeader({
  currentDate,
  viewMode,
  onViewChange,
  onDateChange,
  onToday,
  onNewMeeting,
}: CalendarHeaderProps) {

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7);
    else if (viewMode === 'day') newDate.setDate(newDate.getDate() - 1);
    else newDate.setMonth(newDate.getMonth() - 1);
    onDateChange(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7);
    else if (viewMode === 'day') newDate.setDate(newDate.getDate() + 1);
    else newDate.setMonth(newDate.getMonth() + 1);
    onDateChange(newDate);
  };

  return (
    <div className="calendar-header">
      <div className="left-controls">
        <button onClick={onToday} className="btn btn-secondary">Today</button>
        <div className="nav-buttons">
          <button onClick={handlePrev} className="icon-btn">◀</button>
          <button onClick={handleNext} className="icon-btn">▶</button>
        </div>
        <h2 className="current-date">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
      </div>

      <div className="view-switcher">
        <button
          className={`view-btn ${viewMode === 'day' ? 'active' : ''}`}
          onClick={() => onViewChange('day')}
        >
          Day
        </button>
        <button
          className={`view-btn ${viewMode === 'week' ? 'active' : ''}`}
          onClick={() => onViewChange('week')}
        >
          Week
        </button>
        <button
          className={`view-btn ${viewMode === 'month' ? 'active' : ''}`}
          onClick={() => onViewChange('month')}
        >
          Month
        </button>
      </div>

      <div className="actions" style={{ display: 'flex', gap: '8px' }}>
        <button
          className="btn btn-secondary icon-btn-large"
          onClick={() => {
            // Trigger global listener for Cmd+K
            document.dispatchEvent(new KeyboardEvent('keydown', {
              key: 'k',
              code: 'KeyK',
              metaKey: true,
              ctrlKey: true,
              bubbles: true
            }));
          }}
          title="Voice Command (Cmd+K)"
        >
          <Mic size={20} />
        </button>
        <button onClick={onNewMeeting} className="btn btn-primary">+ New Meeting</button>
      </div>

      <style jsx>{`
        .calendar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--spacing-lg);
        }

        .left-controls {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .nav-buttons {
          display: flex;
          gap: var(--spacing-xs);
        }

        .icon-btn {
          padding: 0.5rem;
          border-radius: 50%;
          color: var(--color-text-secondary);
        }

        .icon-btn:hover {
          background-color: var(--color-bg-secondary);
          color: var(--color-text-main);
        }

        .current-date {
          font-size: 1.5rem;
          font-weight: bold;
          min-width: 200px;
        }

        .view-switcher {
          display: flex;
          background-color: var(--color-bg-secondary);
          padding: 4px;
          border-radius: var(--radius-md);
        }

        .view-btn {
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          font-weight: 500;
          color: var(--color-text-secondary);
        }

        .view-btn.active {
          background-color: var(--color-bg-main);
          color: var(--color-text-main);
          box-shadow: var(--shadow-sm);
        }

        .icon-btn-large {
            padding: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }
      `}</style>
    </div>
  );
}
