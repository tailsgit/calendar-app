"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, startOfWeek, addDays, isSameDay, isSameHour } from 'date-fns';
import MeetingRequestForm from '@/components/calendar/MeetingRequestForm';
import { toast } from 'react-hot-toast'; // Assuming toast exists or use console


interface UserProfile {
  id: string;
  name: string | null;
  image: string | null;
  status: string;
  department: string | null;
  title: string | null;
  email: string | null;
  timeZone: string | null;
}

import { toZonedTime } from 'date-fns-tz';
import { Clock } from 'lucide-react';

interface BusySlot {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  type: 'event' | 'request' | 'external_event';
  title?: string;
}

interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [busySlots, setBusySlots] = useState<BusySlot[]>([]);
  const [viewerBusySlots, setViewerBusySlots] = useState<BusySlot[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);
  const [successMessage, setSuccessMessage] = useState('');


  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)); // Mon-Sun
  const hours = Array.from({ length: 16 }, (_, i) => i + 7); // 7 AM - 10 PM

  const HOUR_HEIGHT = 60;
  const START_HOUR = 7;
  const HOURS_COUNT = 16;
  const HEADER_HEIGHT = 70;
  const TIME_COL_WIDTH = 60;

  useEffect(() => {
    fetchUserData();
  }, [userId, selectedDate]);

  const fetchUserData = async () => {
    try {
      const res = await fetch(`/api/users/${userId}/calendar?date=${selectedDate.toISOString()}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setBusySlots(data.busySlots || []);
        setViewerBusySlots(data.viewerBusySlots || []);
        setAvailability(data.availability || []);
        setIsTeamMember(data.isTeamMember || false);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
    setLoading(false);
  };

  // --- SELECTION HANDLERS REMOVED ---
  // ...

  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>, day: Date) => {
    // If we just finished a drag selection, ignore this click
    // if (showReplicateMenu || selectionBox) return; // Removed

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutesFromStart = (y / HOUR_HEIGHT) * 60;
    const snappedMinutes = Math.round(minutesFromStart / 15) * 15;

    const clickDate = new Date(day);
    clickDate.setHours(START_HOUR, 0, 0, 0);
    clickDate.setMinutes(snappedMinutes);

    // Check Host Busy
    const isHostBusy = busySlots.some(slot => {
      const s = new Date(slot.startTime);
      const e = new Date(slot.endTime);
      return clickDate >= s && clickDate < e;
    });
    if (isHostBusy) return;

    // Check Viewer Busy (don't allow booking if I am busy)
    const isViewerBusy = viewerBusySlots.some(slot => {
      const s = new Date(slot.startTime);
      const e = new Date(slot.endTime);
      return clickDate >= s && clickDate < e;
    });
    // Optional: Block booking if viewer is busy? 
    // User requested "Ghost Event" visualization, usually implies blocking.
    // Let's block it for safety or just show warning. 
    // Usually clicking a ghost event selects it? Let's simplify: if visual is there, maybe alert.
    // For now, allow click but UI shows conflict.

    // Check availability
    if (!isTeamMember) {
      // ... existing availability check
      const dayOfWeek = day.getDay();
      const dayConfig = availability.find(a => a.dayOfWeek === dayOfWeek);
      if (!dayConfig || !dayConfig.isEnabled) return;

      const clickTimeMins = clickDate.getHours() * 60 + clickDate.getMinutes();
      const [sH, sM] = dayConfig.startTime.split(':').map(Number);
      const [eH, eM] = dayConfig.endTime.split(':').map(Number);
      const startMins = sH * 60 + sM;
      const endMins = eH * 60 + eM;

      if (clickTimeMins < startMins || clickTimeMins >= endMins) return;
    }

    setSelectedSlot({ date: clickDate, hour: clickDate.getHours() });
    setShowRequestForm(true);
  };

  const getEventStyle = (start: Date, end: Date) => {
    const startHour = start.getHours();
    const startMin = start.getMinutes();
    const minutesFromStart = (startHour - START_HOUR) * 60 + startMin;

    const top = (minutesFromStart / 60) * HOUR_HEIGHT;
    const durationMins = (end.getTime() - start.getTime()) / (1000 * 60);
    const height = (durationMins / 60) * HOUR_HEIGHT;

    return {
      top: `${Math.max(0, top)}px`,
      height: `${Math.max(15, height)}px`,
      left: '4px',
      right: '4px'
    };
  };

  const getSlotStatus = (day: Date, hour: number) => {
    // ... existing logic ...
    if (!isTeamMember) {
      const dayOfWeek = day.getDay();
      const dayConfig = availability.find(a => a.dayOfWeek === dayOfWeek);
      if (!dayConfig || !dayConfig.isEnabled) return 'unavailable';

      const slotTime = hour * 60;
      const [sH, sM] = dayConfig.startTime.split(':').map(Number);
      const [eH, eM] = dayConfig.endTime.split(':').map(Number);
      const startMins = sH * 60 + sM;
      const endMins = eH * 60 + eM;
      if (slotTime < startMins || slotTime >= endMins) return 'unavailable';
    }
    return 'free';
  };

  // Conflict Detection Helper
  const getConflict = (hostSlot: BusySlot) => {
    const hStart = new Date(hostSlot.startTime);
    const hEnd = new Date(hostSlot.endTime);

    return viewerBusySlots.find(vSlot => {
      const vStart = new Date(vSlot.startTime);
      const vEnd = new Date(vSlot.endTime);
      // Overlap logic: (StartA < EndB) and (EndA > StartB)
      return hStart < vEnd && hEnd > vStart;
    });
  };

  const handleRequestSuccess = () => {
    setShowRequestForm(false);
    setSuccessMessage(`Request sent to ${user?.name}!`);
    setTimeout(() => setSuccessMessage(''), 5000);
    fetchUserData(); // Refresh to show pending slot
  };

  if (loading) return <div className="loading">Loading profile...</div>;
  if (!user) return <div className="error">User not found</div>;

  return (
    <div className="user-profile-page">
      {/* Top Bar */}
      <div className="profile-header">
        <button className="back-btn" onClick={() => router.back()}>← Back</button>

        <div className="profile-info">
          <div className="avatar-large">
            {user.image ? (
              <img src={user.image} alt="" />
            ) : (
              user.name?.slice(0, 2).toUpperCase() || 'U'
            )}
            <span className={`status-indicator ${user.status}`} />
          </div>
          <div className="details">
            <h1>{user.name}</h1>
            <div className="meta">
              {user.title} • {user.department}
            </div>
            <div className="contact">
              <a href={`mailto:${user.email}`} className="email-link">📧 {user.email}</a>
            </div>
            {user.timeZone && (
              <div className="timezone-info flex items-center text-sm text-neutral-500 mt-1">
                <Clock size={14} className="mr-1" />
                <span>
                  {format(toZonedTime(new Date(), user.timeZone), 'h:mm a')}
                  <span className="ml-1 text-neutral-400">({user.timeZone})</span>
                </span>
              </div>
            )}
          </div>
          <div className="actions">
            <button className="request-btn" onClick={() => setShowRequestForm(true)}>
              Request Meeting
            </button>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="success-banner">
          ✓ {successMessage}
        </div>
      )}

      {/* Calendar Grid */}
      <div className="calendar-container">
        <div className="calendar-header">
          <h2>{user.name}'s Calendar</h2>
          <div className="week-nav">
            <button className="nav-btn" onClick={() => setSelectedDate(addDays(selectedDate, -7))}>← Prev Week</button>
            <span>{format(weekStart, 'MMM d')} - {format(addDays(weekStart, 4), 'MMM d, yyyy')}</span>
            <button className="nav-btn" onClick={() => setSelectedDate(addDays(selectedDate, 7))}>Next Week →</button>
          </div>
        </div>

        <div className="calendar-grid">
          {/* Time Column */}
          <div className="time-labels-col">
            <div className="header-cell" /> {/* Empty corner */}
            {hours.map(hour => (
              <div key={hour} className="time-label" style={{ height: HOUR_HEIGHT }}>
                <span>{format(new Date().setHours(hour, 0), 'h a')}</span>
              </div>
            ))}
          </div>

          {/* Day Columns */}
          {weekDays.map(day => {
            // ... existing filters ...
            const dayEvents = busySlots.filter(slot => {
              const s = new Date(slot.startTime);
              return s.getDate() === day.getDate() && s.getMonth() === day.getMonth();
            });

            // Viewer Events (Scenario B check)
            const dayViewerEvents = viewerBusySlots.filter(vSlot => {
              const vStart = new Date(vSlot.startTime);
              // 1. Must be same day
              if (vStart.getDate() !== day.getDate() || vStart.getMonth() !== day.getMonth()) return false;
              // 2. Must NOT overlap with any Host event
              return !dayEvents.some(hSlot => {
                const hStart = new Date(hSlot.startTime);
                const hEnd = new Date(hSlot.endTime);
                return vStart < hEnd && hStart < new Date(vSlot.endTime);
              });
            });

            return (
              <div key={day.toISOString()} className="day-column">
                <div className={`day-header ${isSameDay(day, new Date()) ? 'today' : ''}`}>
                  <div className="day-name">{format(day, 'EEE')}</div>
                  <div className="day-num">{format(day, 'd')}</div>
                </div>

                <div
                  className="day-content"
                  style={{ height: HOURS_COUNT * HOUR_HEIGHT }}
                  onClick={(e) => handleBackgroundClick(e, day)}
                >
                  {/* Background Grid Cells */}
                  {hours.map(hour => (
                    <div
                      key={hour}
                      className={`grid-cell ${getSlotStatus(day, hour)}`}
                      style={{ height: HOUR_HEIGHT }}
                    />
                  ))}

                  {/* Render Ghosts */}
                  {dayViewerEvents.map(slot => (
                    <div
                      key={`ghost-${slot.id}`}
                      className="event-card ghost-event"
                      style={getEventStyle(new Date(slot.startTime), new Date(slot.endTime))}
                    >
                      <span className="event-label">You: {slot.status === 'BUSY' ? 'Busy' : 'Event'}</span>
                    </div>
                  ))}

                  {/* Render Events */}
                  {dayEvents.map(slot => {
                    const conflict = getConflict(slot);
                    return (
                      <div
                        key={slot.id}
                        className={`event-card ${slot.type}`}
                        style={getEventStyle(new Date(slot.startTime), new Date(slot.endTime))}
                      >
                        {slot.type === 'request' && <span className="event-label">Request</span>}
                        {(slot.type === 'event' || slot.type === 'external_event') && (
                          <span className="event-label">
                            Busy: {format(new Date(slot.startTime), 'h:mm')} - {format(new Date(slot.endTime), 'h:mm')}
                          </span>
                        )}
                        {conflict && (
                          <div className="conflict-badge group">
                            !
                            {/* Tooltip */}
                            <div className="conflict-tooltip">
                              <div className="font-semibold mb-1 text-red-600">Conflict</div>
                              <div className="font-medium text-gray-900">{conflict.title || 'Busy'}</div>
                              <div className="text-gray-500 text-xs">
                                {format(new Date(conflict.startTime), 'h:mm a')} - {format(new Date(conflict.endTime), 'h:mm a')}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

        </div>
      </div>

      {/* Modals ... */}
      {showRequestForm && (
        <MeetingRequestForm
          recipient={user}
          initialDate={selectedSlot?.date || new Date()}
          initialTime={selectedSlot?.date?.getHours() || 9}
          onClose={() => setShowRequestForm(false)}
          onSuccess={handleRequestSuccess}
        />
      )}

      <style jsx>{`
        .user-profile-page {
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .profile-header {
          padding: var(--spacing-lg);
          background: var(--color-bg-main);
          border-bottom: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          gap: var(--spacing-xl);
          flex-shrink: 0;
        }

        /* ... existing header styles ... */
        .back-btn { color: var(--color-text-secondary); font-size: 0.9rem; }
        .profile-info { display: flex; align-items: center; gap: var(--spacing-lg); flex: 1; }
        .avatar-large { width: 80px; height: 80px; border-radius: 50%; background: var(--color-accent); color: white; font-size: 2rem; display: flex; align-items: center; justify-content: center; position: relative; }
        .avatar-large img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
        .status-indicator { position: absolute; bottom: 4px; right: 4px; width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--color-bg-main); }
        .status-indicator.available { background: var(--color-success); }
        .status-indicator.busy { background: var(--color-error); }
        .status-indicator.away { background: var(--color-warning); }
        .details h1 { font-size: 1.5rem; margin-bottom: var(--spacing-xs); }
        .meta { color: var(--color-text-secondary); margin-bottom: var(--spacing-xs); }
        .email-link { color: var(--color-accent); font-size: 0.9rem; }
        .actions { margin-left: auto; }
        .request-btn { padding: 0.75rem 1.5rem; background: var(--color-secondary-brand); color: white; border-radius: var(--radius-md); font-weight: 600; font-size: 1rem; transition: transform var(--transition-fast); }
        .request-btn:hover { transform: scale(1.05); }

        .success-banner {
          background: var(--color-success);
          color: white;
          padding: var(--spacing-md);
          text-align: center;
          font-weight: 500;
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }

        .calendar-container {
          flex: 1;
          padding: var(--spacing-lg);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-lg);
        }

        .week-nav { display: flex; align-items: center; gap: var(--spacing-md); color: var(--color-text-main); }
        .nav-btn { color: var(--color-text-secondary); padding: var(--spacing-sm); border-radius: var(--radius-md); transition: all var(--transition-fast); white-space: nowrap; }
        .nav-btn:hover { color: var(--color-text-main); background: var(--color-bg-secondary); }

        /* --- NEW GRID STYLES --- */
        .calendar-grid {
          flex: 1;
          display: flex;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          background: var(--color-bg-main);
          overflow-y: auto;
        }

        .time-labels-col {
          width: 60px;
          flex-shrink: 0;
          border-right: 1px solid var(--color-border);
          background: var(--color-bg-main);
          position: sticky;
          left: 0;
          z-index: 10;
        }

        .header-cell {
            height: 70px; /* Match day-header height roughly */
            border-bottom: 1px solid var(--color-border);
            background: var(--color-bg-secondary);
        }

        .time-label {
            display: flex;
            justify-content: flex-end;
            padding-right: var(--spacing-sm);
            color: var(--color-text-secondary);
            font-size: 0.75rem;
            /* transform: translateY(-50%); */ /* Center label on line? Or preserve old look */
            /* Actually, alignment looks better if label is at top or -0.5em */
            align-items: flex-start; 
            padding-top: 4px;
        }

        .day-column {
          flex: 1;
          border-right: 1px solid var(--color-border);
          min-width: 100px;
          display: flex;
          flex-direction: column;
        }
        .day-column:last-child { border-right: none; }

        .day-header {
          padding: var(--spacing-md);
          text-align: center;
          border-bottom: 1px solid var(--color-border);
          background: var(--color-bg-secondary);
          position: sticky;
          top: 0;
          z-index: 5;
          height: 70px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .day-header.today { background: var(--color-bg-highlight); }
        .day-name { font-weight: 600; font-size: 0.9rem; margin-bottom: 2px; }
        .day-num { font-size: 1.1rem; }

        .day-content {
          position: relative; /* Container for absolute events */
          flex: 1;
        }

        .grid-cell {
          border-bottom: 1px solid var(--color-border);
          box-sizing: border-box;
          transition: background-color var(--transition-fast);
        }
        .grid-cell:hover {
            background-color: var(--color-bg-highlight);
            cursor: pointer;
        }
        
        /* Availability Coloring */
        .grid-cell.unavailable {
           background: var(--color-bg-secondary);
           opacity: 0.5;
           cursor: not-allowed;
           background-image: repeating-linear-gradient(
             -45deg,
             transparent,
             transparent 5px,
             rgba(0,0,0,0.05) 5px,
             rgba(0,0,0,0.05) 10px
           );
        }

        /* EVENTS */
        .event-card {
            position: absolute;
            background-color: var(--color-bg-secondary);
            background-image: repeating-linear-gradient(
                45deg,
                var(--color-bg-secondary),
                var(--color-bg-secondary) 10px,
                var(--color-border) 10px,
                var(--color-border) 20px
            );
            color: var(--color-text-secondary);
            border: 1px solid var(--color-border);
            border-radius: 4px;
            font-size: 0.75rem;
            padding: 2px 6px;
            /* overflow: hidden; Removed to allow tooltip to extend */
            z-index: 2;
            cursor: not-allowed;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            pointer-events: auto;
            display: flex;
            align-items: center;
        }

        /* ... (other styles) ... */

        /* CONFLICT BADGE */
        .conflict-badge {
            position: absolute;
            top: -6px;
            right: -6px;
            background: #EF4444; /* Red-500 */
            color: white;
            width: 16px; 
            height: 16px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 10px;
            cursor: pointer;
            z-index: 10;
            box-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        
        .conflict-tooltip {
            display: none;
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 4px;
            background: white;
            color: #1F2937;
            padding: 8px;
            border-radius: 6px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            width: max-content;
            min-width: 160px;
            max-width: 250px;
            z-index: 100;
            border: 1px solid #EF4444;
            font-size: 0.75rem;
            line-height: 1.25;
            white-space: normal;
        }
        
        /* Show tooltip on hover of the badge container */
        .conflict-badge:hover .conflict-tooltip {
            display: block;
        }

        .loading, .error { padding: var(--spacing-xl); text-align: center; color: var(--color-text-secondary); }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
