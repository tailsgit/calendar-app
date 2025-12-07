"use client";

import { format } from 'date-fns';

interface EventProps {
  title: string;
  startTime: Date;
  endTime: Date;
  color?: string;
  status?: string; // SCHEDULED, PENDING, ACCEPTED, DECLINED
  onClick?: () => void;
  top?: number; // Optional override for positioning
}

export default function EventCard({
  title,
  startTime,
  endTime,
  color = 'var(--color-accent)',
  status,
  onClick,
  top: customTop
}: EventProps) {
  // Calculate height and position based on time
  // This logic assumes the parent container is relative and 1 hour = 60px
  const startHour = startTime.getHours();
  const startMin = startTime.getMinutes();
  const durationMin = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

  const top = customTop !== undefined ? customTop : ((startHour * 60) + startMin);
  const height = durationMin; // 1 min = 1px height

  return (
    <div
      className="event-card"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: status === 'PROPOSED' ? 'white' : color,
        color: status === 'PROPOSED' ? color : 'white',
        borderLeft: `4px solid ${color}`,
        border: status === 'PROPOSED' ? `2px dashed ${color}` : undefined,
        borderLeftStyle: status === 'PROPOSED' ? 'solid' : undefined, // Keep left border solid
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <div className="event-content">
        <div className="event-title">
          {status === 'PENDING' && <span className="pending-dot" title="Pending">● </span>}
          {status === 'PROPOSED' && <span className="proposed-icon" title="Proposed">📝 </span>}
          {title}
        </div>
        <div className="event-time">
          {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
        </div>
      </div>

      <style jsx>{`
        .pending-dot { color: #f59e0b; margin-right: 4px; }
        .proposed-icon { margin-right: 4px; font-size: 0.8em; }

        .event-card {
          position: absolute;
          left: 4px;
          right: 4px;
          border-radius: var(--radius-sm);
          padding: 4px 8px;
          font-size: 0.75rem;
          color: white;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.1s;
          opacity: 0.9;
          z-index: 1;
        }
        
        /* Proposed State Styling */
        /* We'll use a data attribute selector or just inline style for now if we don't pass class */
        /* But better to use the status prop if we can access it in CSS. Since strict JSX, we rely on inline or prop-based styles */
        .event-card:hover {
          transform: scale(1.02);
          z-index: 2;
          opacity: 1;
        }

        .event-title {
          font-weight: bold;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .event-time {
          font-size: 0.7rem;
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}
