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

  const isSlotBusy = (day: Date, hour: number) => {
    // 1. Availability Rules (Skip if Team Member)
    // Team members see ALL slots unless actually busy with an event
    if (!isTeamMember) {
      const dayOfWeek = day.getDay(); // 0 = Sunday
      const dayConfig = availability.find(a => a.dayOfWeek === dayOfWeek);

      if (!dayConfig || !dayConfig.isEnabled) return 'unavailable';

      const slotTime = hour * 60; // minutes from midnight
      const [startHour, startMin] = dayConfig.startTime.split(':').map(Number);
      const [endHour, endMin] = dayConfig.endTime.split(':').map(Number);
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;

      if (slotTime < startTime || slotTime >= endTime) return 'unavailable';
    }

    // 2. Actual Calendar Events
    const isBusy = busySlots.some(slot => {
      const slotStart = new Date(slot.startTime);
      const slotEnd = new Date(slot.endTime);
      const slotHour = new Date(day);
      slotHour.setHours(hour, 0, 0, 0);

      // Simple overlap check for the hour slot
      // Slot: 14:00 - 15:00
      // Event: 14:30 - 15:00 -> Busy
      const slotHourEnd = new Date(slotHour);
      slotHourEnd.setHours(hour + 1);

      return slotStart < slotHourEnd && slotEnd > slotHour;
    });

    return isBusy ? 'busy' : 'free';
  };

  const handleSlotClick = (day: Date, hour: number) => {
    if (isSlotBusy(day, hour) !== 'free') return;

    setSelectedSlot({ date: day, hour });
    setShowRequestForm(true);
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
          <div className="time-col header" />
          {weekDays.map(day => (
            <div key={day.toISOString()} className={`day-col header ${isSameDay(day, new Date()) ? 'today' : ''}`}>
              <div className="day-name">{format(day, 'EEE')}</div>
              <div className="day-num">{format(day, 'd')}</div>
            </div>
          ))}

          {hours.map(hour => (
            <div key={`row-${hour}`} style={{ display: 'contents' }}>
              <div className="time-col">
                {format(new Date().setHours(hour, 0), 'h a')}
              </div>
              {weekDays.map(day => {
                const status = isSlotBusy(day, hour);
                return (
                  <div
                    key={`${day}-${hour}`}
                    className={`time-slot ${status}`}
                    onClick={() => handleSlotClick(day, hour)}
                  >
                    {status === 'busy' && <span className="busy-label">Busy</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {showRequestForm && (
        <MeetingRequestForm
          recipient={user}
          initialDate={selectedSlot?.date || new Date()}
          initialTime={selectedSlot?.hour || 9}
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
        }

        .back-btn {
          color: var(--color-text-secondary);
          font-size: 0.9rem;
        }

        .profile-info {
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
          flex: 1;
        }

        .avatar-large {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--color-accent);
          color: white;
          font-size: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .avatar-large img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .status-indicator {
          position: absolute;
          bottom: 4px;
          right: 4px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid var(--color-bg-main);
        }

        .status-indicator.available { background: var(--color-success); }
        .status-indicator.busy { background: var(--color-error); }
        .status-indicator.away { background: var(--color-warning); }

        .details h1 {
          font-size: 1.5rem;
          margin-bottom: var(--spacing-xs);
        }

        .meta {
          color: var(--color-text-secondary);
          margin-bottom: var(--spacing-xs);
        }

        .email-link {
          color: var(--color-accent);
          font-size: 0.9rem;
        }

        .actions {
          margin-left: auto;
        }

        .request-btn {
          padding: 0.75rem 1.5rem;
          background: var(--color-secondary-brand);
          color: white;
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: 1rem;
          transition: transform var(--transition-fast);
        }

        .request-btn:hover {
          transform: scale(1.05);
        }

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

        .week-nav {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          color: var(--color-text-main);
        }

        .nav-btn {
          color: var(--color-text-secondary);
          padding: var(--spacing-sm);
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
          white-space: nowrap;
        }

        .nav-btn:hover {
          color: var(--color-text-main);
          background: var(--color-bg-secondary);
        }

        .calendar-grid {
          flex: 1;
          display: grid;
          grid-template-columns: 60px repeat(7, 1fr);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          background: var(--color-bg-main);
          overflow-y: auto;
        }

        .time-col {
          padding: var(--spacing-sm);
          text-align: right;
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          border-right: 1px solid var(--color-border);
          border-bottom: 1px solid var(--color-border);
        }

        .day-col {
          padding: var(--spacing-md);
          text-align: center;
          border-bottom: 1px solid var(--color-border);
          background: var(--color-bg-secondary);
          position: sticky;
          top: 0;
        }

        .day-col.today {
          background: var(--color-bg-highlight);
        }

        .time-slot {
          border-right: 1px solid var(--color-border);
          border-bottom: 1px solid var(--color-border);
          height: 60px;
          transition: background-color var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .time-slot.free:hover {
          background: var(--color-bg-highlight);
          cursor: pointer;
        }

        .time-slot.unavailable {
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

        .time-slot.busy {
          background: var(--color-bg-secondary);
          background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(0,0,0,0.05) 10px,
            rgba(0,0,0,0.05) 20px
          );
          cursor: not-allowed;
        }

        .busy-label {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          font-weight: 500;
        }

        .loading, .error {
          padding: var(--spacing-xl);
          text-align: center;
          color: var(--color-text-secondary);
        }
      `}</style>
    </div>
  );
}
