"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, startOfWeek, addDays, isSameDay, isSameHour } from 'date-fns';
import MeetingRequestForm from '@/components/calendar/MeetingRequestForm';

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
  type: 'event' | 'request';
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
        setAvailability(data.availability || []);
        setIsTeamMember(data.isTeamMember || false);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
    setLoading(false);
  };

  const HOUR_HEIGHT = 60;
  const START_HOUR = 7;
  const HOURS_COUNT = 16;

  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>, day: Date) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutesFromStart = (y / HOUR_HEIGHT) * 60;

    // Snap to 15 minutes
    const snappedMinutes = Math.round(minutesFromStart / 15) * 15;

    const clickDate = new Date(day);
    clickDate.setHours(START_HOUR, 0, 0, 0);
    clickDate.setMinutes(snappedMinutes);

    // Check if clicked time is available
    // Availability determines if we can click
    // We can reuse the isSlotBusy logic but for specific minute? 
    // For now, let's allow the click and let the background visual indicate availability.
    // Or we can check if the snapped time falls into a "unavailable" background block.

    // Simple check: is this exact time inside a busy slot? (UI shows it, but logic should prevent)
    const isBusy = busySlots.some(slot => {
      const s = new Date(slot.startTime);
      const e = new Date(slot.endTime);
      return clickDate >= s && clickDate < e;
    });

    if (isBusy) return;

    // Check availability rules
    if (!isTeamMember) {
      const dayOfWeek = day.getDay();
      const dayConfig = availability.find(a => a.dayOfWeek === dayOfWeek);
      if (!dayConfig || !dayConfig.isEnabled) return; // Unavailable day

      const clickTimeMins = clickDate.getHours() * 60 + clickDate.getMinutes();
      const [sH, sM] = dayConfig.startTime.split(':').map(Number);
      const [eH, eM] = dayConfig.endTime.split(':').map(Number);
      const startMins = sH * 60 + sM;
      const endMins = eH * 60 + eM;

      if (clickTimeMins < startMins || clickTimeMins >= endMins) return; // Unavailable time
    }

    setSelectedSlot({ date: clickDate, hour: clickDate.getHours() }); // hour param technically redundant now but kept for compat
    setShowRequestForm(true);
  };

  const getEventStyle = (slot: BusySlot) => {
    const start = new Date(slot.startTime);
    const end = new Date(slot.endTime);

    // Calculate top relative to START_HOUR
    const startHour = start.getHours();
    const startMin = start.getMinutes();
    const minutesFromStart = (startHour - START_HOUR) * 60 + startMin;

    const top = (minutesFromStart / 60) * HOUR_HEIGHT;

    // Calculate height
    const durationMins = (end.getTime() - start.getTime()) / (1000 * 60);
    const height = (durationMins / 60) * HOUR_HEIGHT;

    return {
      top: `${Math.max(0, top)}px`,
      height: `${Math.max(15, height)}px`, // Min height for visibility
      left: '4px',
      right: '4px'
    };
  };

  // Helper for background coloring (similar to old isSlotBusy but just for background)
  const getSlotStatus = (day: Date, hour: number) => {
    if (!isTeamMember) {
      const dayOfWeek = day.getDay();
      const dayConfig = availability.find(a => a.dayOfWeek === dayOfWeek);
      if (!dayConfig || !dayConfig.isEnabled) return 'unavailable';

      const slotTime = hour * 60;
      const [sH, sM] = dayConfig.startTime.split(':').map(Number);
      const [eH, eM] = dayConfig.endTime.split(':').map(Number); // e.g. 17:00
      const startMins = sH * 60 + sM;
      const endMins = eH * 60 + eM; // 17*60 = 1020

      // If slot is 16:00 (960 mins), it is VALID if 960 >= 540 && 960 < 1020.
      // If slot is 17:00, it is INVALID.
      if (slotTime < startMins || slotTime >= endMins) return 'unavailable';
    }
    return 'free';
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
            const dayEvents = busySlots.filter(slot => {
              const s = new Date(slot.startTime);
              // Simple day check (timezone naive for now, assumes consistent base)
              return s.getDate() === day.getDate() && s.getMonth() === day.getMonth();
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

                  {/* Absolute Events */}
                  {dayEvents.map(slot => (
                    <div
                      key={slot.id}
                      className={`event-card ${slot.type}`}
                      style={getEventStyle(slot)}
                      title={slot.type === 'event' ? 'Busy' : 'Proposed Request'}
                    >
                      {slot.type === 'request' && <span className="event-label">Request</span>}
                      {slot.type === 'event' && isTeamMember && <span className="event-label">Busy</span>}
                      {/* External events might have title 'Busy' from API */}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
            background: var(--color-secondary-brand);
            color: white;
            border-radius: 4px;
            font-size: 0.75rem;
            padding: 2px 4px;
            overflow: hidden;
            z-index: 2;
            cursor: default;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            /* pointer-events: none; */ /* Let clicks pass through to grid? No, events usually block */
            pointer-events: auto;
        }

        .event-card.external_event {
             background: #6366F1; /* Indigo */
             border-left: 3px solid #4F46E5;
        }
        
        .event-card.request {
             background: var(--color-warning); /* Orange for pending */
             color: #7c2d12;
             opacity: 0.9;
        }
        
        .event-label {
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: block;
        }

        .loading, .error { padding: var(--spacing-xl); text-align: center; color: var(--color-text-secondary); }
      `}</style>
    </div>
  );
}
