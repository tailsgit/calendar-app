"use client";

import { format } from 'date-fns';
import { useState } from 'react';

interface EventProps {
  title: string;
  startTime: Date;
  endTime: Date;
  color?: string;
  status?: string; // SCHEDULED, PENDING, ACCEPTED, DECLINED
  onClick?: () => void;
  top?: number; // Optional override for positioning
  isLunch?: boolean;
  left?: string;
  width?: string;
  zIndex?: number;
}

export default function EventCard({
  title,
  startTime,
  endTime,
  color = 'var(--color-accent)',
  status,
  onClick,
  top: customTop,
  isLunch,
  left,
  width,
  zIndex
}: EventProps) {
  // Clamp height to end of the day to prevent overflow
  const startHour = startTime.getHours();
  const startMin = startTime.getMinutes();

  const startOfDay = new Date(startTime);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  let visualEndTime = endTime;
  if (endTime > endOfDay) {
    visualEndTime = endOfDay;
  }

  let durationMin = (visualEndTime.getTime() - startTime.getTime()) / (1000 * 60);

  // Enforce minimum height for visibility (e.g. 20 mins/px)
  if (durationMin < 20) durationMin = 20;

  const top = customTop !== undefined ? customTop : ((startHour * 60) + startMin);
  const height = durationMin;
  const [isHovered, setIsHovered] = useState(false);

  // Calculate visual properties
  const minExpandedHeight = 80; // Enough for title + time
  const expandedHeightBase = Math.max(height, minExpandedHeight);

  // Calculate vertical growth to center the expansion
  const heightDiff = expandedHeightBase - height;

  // Hover State Calculations
  const finalHeight = isHovered ? expandedHeightBase : height;
  const finalTop = isHovered ? top - (heightDiff / 2) : top;
  const finalLeft = isHovered ? '2px' : (left || '4px'); // Expand to full width (almost)
  const finalWidth = isHovered ? 'calc(100% - 8px)' : (width || 'calc(100% - 8px)');

  const showTitle = finalHeight >= 25;
  const showTime = finalHeight >= 40;

  return (
    <div
      className="event-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        top: `${finalTop}px`,
        height: `${finalHeight}px`,
        left: finalLeft,
        width: finalWidth,
        zIndex: isHovered ? 100 : (zIndex || 1),
        backgroundColor: status === 'PROPOSED' ? 'white' : color,
        color: status === 'PROPOSED' ? color : 'white',
        borderLeft: `4px solid ${color}`,
        border: status === 'PROPOSED' ? `2px dashed ${color}` : undefined,
        borderLeftStyle: status === 'PROPOSED' ? 'solid' : undefined,
        boxShadow: isHovered ? '0 8px 16px rgba(0,0,0,0.25)' : 'none',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <div className="event-content">
        {showTitle && (
          <div className="event-title">
            {status === 'PENDING' && <span className="pending-dot" title="Pending">● </span>}
            {status === 'PROPOSED' && <span className="proposed-icon" title="Proposed">📝 </span>}
            {title}
          </div>
        )}

        {showTime && (
          <div className="event-time">
            {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
            {isMultiDay && <span style={{ opacity: 0.8, marginLeft: '4px' }}>(+1)</span>}
          </div>
        )}
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
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          opacity: ${isPast ? 0.5 : (isLunch ? 0.85 : 1)};
        }
        
        /* Proposed State Styling */
        /* We'll use a data attribute selector or just inline style for now if we don't pass class */
        /* But better to use the status prop if we can access it in CSS. Since strict JSX, we rely on inline or prop-based styles */
        .event-card:hover {
          opacity: 1;
        }

        .event-title {
          font-weight: bold;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
        }

        .event-time {
          font-size: 0.7rem;
          opacity: 0.9;
          margin-top: 2px;
          line-height: 1.1;
        }
      `}</style>
    </div>
  );
}
