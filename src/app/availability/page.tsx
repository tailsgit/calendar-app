"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Save, Trash2, X, Link as LinkIcon, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { startOfWeek, endOfWeek, addDays, getDay, addWeeks, subWeeks, format, isSameDay } from 'date-fns';

interface AvailabilitySlot {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  dayOfWeek?: number; // Calculated
  color?: string;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7 AM - 9 PM

// Helper to format HH:MM to 12-hour
const formatTime12 = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
};

// Helper to convert time string to minutes
const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

// Helper to convert minutes to time string
const minutesToTime = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export default function AvailabilityPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [editingSlot, setEditingSlot] = useState<{ slot: AvailabilitySlot, index: number } | null>(null);
  const [pendingSlot, setPendingSlot] = useState<{ dayIndex: number, hour: number } | null>(null);

  // View State
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailability();
  }, []);

  useEffect(() => {
    fetchCalendarEvents();
  }, [currentDate, viewMode]);

  const fetchAvailability = async () => {
    try {
      const res = await fetch('/api/user/availability');
      if (res.ok) {
        const data = await res.json();
        // Handle new response format { slots: [], slug: "" }
        const availabilitySlots = data.slots || data; // Fallback if API hasn't deployed or something
        if (data.slug) setSlug(data.slug);

        setSlots(Array.isArray(availabilitySlots) ? availabilitySlots.map((s: any) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime
        })) : []);
      } else {
        toast.error('Failed to load availability');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  // ... (fetchCalendarEvents remains same)

  // ... (navigation handlers remain same)

  const handleCopyLink = () => {
    if (!slug && !session?.user?.id) {
      toast.error('Booking link unavailable');
      return;
    }

    // Prefer slug for public booking page, fallback to user ID (though user ID is likely internal/private)
    // The previous implementation used user ID which was wrong.
    const path = slug ? `/book/${slug}` : `/user/${session?.user?.id}`;
    const link = `${window.location.origin}${path}`;

    navigator.clipboard.writeText(link);
    toast.success('Booking link copied to clipboard!');
  };

  const createSlot = (dayIndex: number, hour: number) => {
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
    const newSlot = { dayOfWeek: dayIndex, startTime, endTime };
    setSlots([...slots, newSlot]);
  };

  const confirmOverride = () => {
    if (pendingSlot) {
      createSlot(pendingSlot.dayIndex, pendingSlot.hour);
      setPendingSlot(null);
      toast.success('Availability added over busy slot');
    }
  };

  const handleGridClick = (dayIndex: number, hour: number) => {
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

    // Check for overlap with existing availability slots
    const newStart = timeToMinutes(startTime);
    const newEnd = timeToMinutes(endTime);

    const hasSlotOverlap = slots.some(s => {
      if (s.dayOfWeek !== dayIndex) return false;
      const sStart = timeToMinutes(s.startTime);
      const sEnd = timeToMinutes(s.endTime);
      return (newStart < sEnd && newEnd > sStart);
    });

    if (hasSlotOverlap) return;

    // Check for Event Overlap
    const hasEventOverlap = calendarEvents.some(e => {
      // Need to check against specific date events if we are in week view?
      // But slots are recurring. So we check against *any* event that falls on this day-of-week *in the visible week*?
      // Yes, that's the logic: overlap with *visible* busy time.

      // Actually, since slots are recurring, checking against this week's events is just a heuristic.
      // It's still useful.

      if (e.dayOfWeek !== dayIndex) return false;
      const start = new Date(e.startTime);
      const end = new Date(e.endTime);
      const eStart = start.getHours() * 60 + start.getMinutes();
      const eEnd = end.getHours() * 60 + end.getMinutes();
      return (newStart < eEnd && newEnd > eStart);
    });

    if (hasEventOverlap) {
      setPendingSlot({ dayIndex, hour });
      return;
    }

    createSlot(dayIndex, hour);
  };

  const handleSlotClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (editingSlot && editingSlot.index === index) {
      deleteSlot(index);
    } else {
      setEditingSlot({ slot: slots[index], index });
    }
  };

  const updateSlot = (index: number, updates: Partial<AvailabilitySlot>) => {
    const updated = [...slots];
    updated[index] = { ...updated[index], ...updates };
    setSlots(updated);
    setEditingSlot({ slot: updated[index], index });
  };

  const deleteSlot = (index: number) => {
    const updated = slots.filter((_, i) => i !== index);
    setSlots(updated);
    setEditingSlot(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: slots })
      });

      if (res.ok) {
        toast.success('Availability saved!');
        router.refresh();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast.error('Error saving availability');
    } finally {
      setSaving(false);
    }
  };

  const timeOptions = Array.from({ length: 48 }).map((_, i) => {
    const h = Math.floor(i / 2);
    const m = (i % 2) * 30;
    const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    const label = `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m === 0 ? '00' : '30'} ${h < 12 ? 'AM' : 'PM'}`;
    return { value: time, label };
  });

  if (loading) return <div className="p-8 text-center text-neutral-500">Loading schedule...</div>;

  return (
    <div className="availability-page container">
      <div className="header">
        <div className="header-left">
          <h1>Booking</h1>

          <div className="nav-controls">
            <div className="view-toggle">
              <button
                className={viewMode === 'week' ? 'active' : ''}
                onClick={() => setViewMode('week')}
              >Week</button>
              <button
                className={viewMode === 'month' ? 'active' : ''}
                onClick={() => setViewMode('month')}
              >Month</button>
            </div>

            <div className="date-nav">
              <button onClick={handlePrev} className="nav-btn">
                <ChevronLeft size={20} />
              </button>
              <button onClick={handleToday} className="nav-btn today-btn">
                Today
              </button>
              <button onClick={handleNext} className="nav-btn">
                <ChevronRight size={20} />
              </button>
            </div>
            <span className="current-date-label">
              {viewMode === 'week' ? format(weekStart, 'MMMM yyyy') : format(currentDate, 'MMMM yyyy')}
            </span>
          </div>

          <p className="link-description">
            Share this link to let others book time with you. They can sign in and schedule meetings during your available slots.
          </p>
          <div className="help-text-container">
            <p className="grid-help">
              <strong>How to use:</strong> Click on the empty grid to add a slot. Click an existing slot to edit or remove it.
            </p>
          </div>
        </div>
        <div className="header-right">
          <button className="btn btn-secondary copy-btn" onClick={handleCopyLink} title="Generate Booking Link">
            <LinkIcon size={16} className="mr-2" /> Copy Link
          </button>
        </div>
      </div>

      {viewMode === 'month' ? (
        <div className="month-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="month-header-cell">{d}</div>
          ))}
          {monthDays.map((date, idx) => {
            const dayIndex = date.getDay();
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const dayEvents = calendarEvents.filter(e => isSameDay(new Date(e.startTime), date));
            const daySlots = slots.filter(s => s.dayOfWeek === dayIndex);
            const isToday = isSameDay(date, new Date());

            return (
              <div key={idx} className={`month-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'is-today' : ''}`}>
                <div className="month-date-label">{format(date, 'd')}</div>
                <div className="month-cell-content">
                  {/* Availability Tiny Bars */}
                  {daySlots.map((s, i) => (
                    <div key={`s-${i}`} className="month-slot-bar" title={`Avail: ${formatTime12(s.startTime)} - ${formatTime12(s.endTime)}`}>
                      <div className="slot-dot"></div>
                      {formatTime12(s.startTime)}
                    </div>
                  ))}
                  {/* Ghost Events - Only show a few */}
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <div key={`e-${i}`} className="month-event-bar" style={{ opacity: 0.6 }}>
                      {e.title || 'Busy'}
                    </div>
                  ))}
                  {dayEvents.length > 3 && <div className="more-events">+{dayEvents.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="visual-grid-container">
          <div className="v-time-col">
            <div className="v-header-cell"></div>
            {HOURS.map(h => (
              <div key={h} className="v-time-cell">
                {h > 12 ? h - 12 : h} {h >= 12 ? 'PM' : 'AM'}
              </div>
            ))}
          </div>
          {weekDays.map((dayObj, dayIndex) => (
            <div key={dayIndex} className={`v-day-col ${dayObj.isToday ? 'is-today' : ''}`}>
              <div className="v-header-cell flex-col">
                <span className="text-xs uppercase text-neutral-500">{dayObj.dayName}</span>
                <span className={`text-lg font-semibold ${dayObj.isToday ? 'text-blue-600' : 'text-neutral-700'}`}>
                  {dayObj.dayNumber}
                </span>
              </div>
              <div className="v-day-content">
                {HOURS.map(h => (
                  <div
                    key={h}
                    className="v-hour-cell"
                    onClick={() => handleGridClick(dayIndex, h)}
                  />
                ))}

                {/* Ghost Events  */}
                {calendarEvents.filter(e => e.dayOfWeek === dayIndex).map((evt, idx) => {
                  const startDate = new Date(evt.startTime);
                  const endDate = new Date(evt.endTime);

                  // Only render if it's ACTUALLY on this date (not just same day of week)
                  // Since we fetch by range, these events are specific instances.
                  // But 'dayOfWeek' simple filter matches any Monday. 
                  // We must check if the date matches dayObj.date for that column.

                  if (!isSameDay(startDate, dayObj.date)) return null;

                  const startMin = startDate.getHours() * 60 + startDate.getMinutes();
                  const endMin = endDate.getHours() * 60 + endDate.getMinutes();

                  const gridStartMin = 7 * 60; // 7 AM
                  if (endMin <= gridStartMin) return null;

                  const effectiveStart = Math.max(startMin, gridStartMin);
                  const effectiveEnd = endMin;

                  const duration = effectiveEnd - effectiveStart;
                  const top = ((effectiveStart - gridStartMin) / 60) * 50;
                  const height = (duration / 60) * 50;

                  return (
                    <div
                      key={`evt-${idx}`}
                      className="v-event-ghost"
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        backgroundColor: evt.color || '#666'
                      }}
                      title={evt.title}
                    >
                      <span className="event-title">{evt.title || 'Busy'}</span>
                    </div>
                  );
                })}

                {/* Availability Slots (Recurring) */}
                {slots.filter(s => s.dayOfWeek === dayIndex).map((slot, idx) => {
                  const startMin = timeToMinutes(slot.startTime);
                  const endMin = timeToMinutes(slot.endTime);
                  const duration = endMin - startMin;
                  const gridStartMin = 7 * 60;

                  const top = ((startMin - gridStartMin) / 60) * 50;
                  const height = (duration / 60) * 50;
                  const originalIndex = slots.indexOf(slot);

                  return (
                    <div
                      key={idx}
                      className="v-slot"
                      style={{ top: `${top}px`, height: `${height}px` }}
                      onClick={(e) => handleSlotClick(e, originalIndex)}
                    >
                      <span>{formatTime12(slot.startTime)} - {formatTime12(slot.endTime)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {pendingSlot && (
        <>
          <div className="popover-backdrop" onClick={() => setPendingSlot(null)} style={{ zIndex: 150 }} />
          <div className="confirm-modal">
            <h3>Overlap Detected</h3>
            <p>This time overlaps with an existing calendar event. Do you really want to mark it as available?</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setPendingSlot(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmOverride}>Yes, Override</button>
            </div>
          </div>
        </>
      )}

      {editingSlot && (
        <>
          <div className="popover-backdrop" onClick={() => setEditingSlot(null)} />
          <div className="edit-popover">
            <div className="popover-header">
              <h3>Edit Availability</h3>
              <button className="icon-btn" onClick={() => setEditingSlot(null)}><X size={18} /></button>
            </div>
            <div className="popover-body">
              <label>Start Time</label>
              <div className="select-wrapper">
                <select
                  value={editingSlot.slot.startTime}
                  onChange={(e) => updateSlot(editingSlot.index, { startTime: e.target.value })}
                >
                  {timeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <label>End Time</label>
              <div className="select-wrapper">
                <select
                  value={editingSlot.slot.endTime}
                  onChange={(e) => updateSlot(editingSlot.index, { endTime: e.target.value })}
                >
                  {timeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="popover-footer">
              <button className="btn btn-danger" onClick={() => deleteSlot(editingSlot.index)}>
                <Trash2 size={16} /> Remove
              </button>
              <button className="btn btn-primary" onClick={() => setEditingSlot(null)}>Done</button>
            </div>
          </div>
        </>
      )}

      <div className="actions-bar">
        <button className="btn btn-primary save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
        </button>
      </div>

      <style jsx>{`
        .availability-page {
          padding-bottom: 5rem;
        }
        
        .header { 
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 2rem; 
            padding-bottom: 2rem;
            border-bottom: 1px solid var(--color-border);
        }

        .header-left {
            flex: 1;
            padding-right: 2rem;
        }

        .header-right {
            flex-shrink: 0;
            padding-top: 0.5rem;
        }
        
        .header h1 {
            font-size: 1.8rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }

        .nav-controls {
            display: flex;
            align-items: center;
            gap: 1.5rem;
            margin-bottom: 1rem;
        }

        .view-toggle {
            display: flex;
            background: var(--color-bg-secondary);
            padding: 4px;
            border-radius: var(--radius-md);
            border: 1px solid var(--color-border);
        }

        .view-toggle button {
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 0.85rem;
            color: var(--color-text-secondary);
            background: transparent;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
        }

        .view-toggle button.active {
            background: var(--color-bg-main);
            color: var(--color-text-main);
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            font-weight: 600;
        }

        .date-nav {
            display: flex;
            align-items: center;
            background: var(--color-bg-secondary);
            border-radius: var(--radius-md);
            border: 1px solid var(--color-border);
            padding: 2px;
        }

        .nav-btn {
            background: transparent;
            border: none;
            padding: 6px;
            color: var(--color-text-main);
            border-radius: 4px;
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
        }
        .nav-btn:hover { background: rgba(0,0,0,0.05); }
        .today-btn { 
            font-size: 0.85rem; 
            font-weight: 600; 
            padding: 0 12px;
        }

        .current-date-label {
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--color-text-main);
            min-width: 150px;
        }

        .link-description {
            color: var(--color-text-secondary);
            font-size: 1rem;
            margin-bottom: 1.5rem;
            max-width: 650px;
            line-height: 1.5;
        }

        .help-text-container {
            display: flex;
        }

        .grid-help {
            font-size: 0.85rem;
            color: var(--color-text-secondary);
            background: var(--color-bg-secondary);
            padding: 10px 16px;
            border-radius: var(--radius-md);
            display: inline-block;
            border: 1px solid var(--color-border);
        }
        
        .visual-grid-container {
          display: flex;
          background: var(--color-bg-main);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        
        .v-time-col {
          width: 60px;
          flex-shrink: 0;
          border-right: 1px solid var(--color-border);
        }
        
        .v-day-col {
          flex: 1;
          border-right: 1px solid var(--color-border);
          min-width: 100px;
        }
        .v-day-col:last-child { border-right: none; }

        .v-day-col.is-today .v-header-cell {
            background: var(--color-bg-highlight);
        }
        
        .v-header-cell {
          height: 50px; /* Taller for date number */
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-bg-secondary);
          border-bottom: 1px solid var(--color-border);
          font-weight: 600;
          color: var(--color-text-secondary);
          font-size: 0.9rem;
        }
        
        .v-header-cell.flex-col {
            flex-direction: column;
            gap: 2px;
            line-height: 1.2;
        }

        .v-day-content {
          position: relative;
        }
        
        .v-time-cell {
          height: 50px;
          border-bottom: 1px solid var(--color-border);
          display: flex;
          align-items: start;
          justify-content: center;
          padding-top: 4px;
          font-size: 0.75rem;
          color: var(--color-text-tertiary);
        }
        
        .v-hour-cell {
          height: 50px;
          border-bottom: 1px solid var(--color-border);
          cursor: pointer;
          transition: background 0.2s;
        }
        .v-hour-cell:hover {
          background: var(--color-bg-secondary);
        }
        
        .v-slot {
          position: absolute;
          left: 4px; right: 4px;
          background: var(--color-accent);
          border-radius: 4px;
          padding: 4px;
          color: white;
          font-size: 0.75rem;
          cursor: pointer;
          overflow: hidden;
          z-index: 10;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .v-event-ghost {
            position: absolute;
            left: 2px; right: 2px;
            border-radius: 4px;
            padding: 2px 4px;
            font-size: 0.7rem;
            color: var(--color-text-main); /* Change from white to main text color for contrast on light bg */
            z-index: 5;
            opacity: 0.6; /* Increased brightness slightly */
            pointer-events: none;
            overflow: hidden;
            font-weight: 500;
        }
        
        .popover-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.2);
          z-index: 90;
        }
        
        .edit-popover {
          position: fixed;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          background: var(--color-bg-main);
          padding: var(--spacing-lg);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xl);
          z-index: 100;
          width: 300px;
          border: 1px solid var(--color-border);
        }
        
        .popover-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: var(--spacing-md);
        }
        
        .popover-body {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-md);
        }
        
        .popover-footer {
          display: flex;
          justify-content: space-between;
        }
        
        .actions-bar {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          z-index: 80;
        }
        
        .icon-btn {
          padding: 4px;
          border-radius: 50%;
          border: none;
          background: transparent;
          cursor: pointer;
          color: var(--color-text-secondary);
        }
        .icon-btn:hover { background: var(--color-bg-secondary); }
        
        .btn-danger {
          color: var(--color-error);
          background: rgba(239, 68, 68, 0.1);
        }
        .btn-danger:hover { background: rgba(239, 68, 68, 0.2); }

        .confirm-modal {
          position: fixed;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          background: var(--color-bg-main);
          padding: var(--spacing-lg);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xl);
          z-index: 200;
          width: 320px;
          border: 1px solid var(--color-border);
          text-align: center;
        }
        .confirm-modal h3 {
            margin-bottom: 0.5rem;
            color: var(--color-warning);
        }
        .confirm-modal p {
            margin-bottom: 1.5rem;
            color: var(--color-text-secondary);
            font-size: 0.9rem;
        }
        .modal-actions {
            display: flex;
            justify-content: center;
            gap: 1rem;
        }

        .select-wrapper select {
           width: 100%;
           padding: 8px;
           border: 1px solid var(--color-border);
           border-radius: var(--radius-md);
           background-color: var(--color-bg-main);
           color: var(--color-text-main);
        }

        /* Month Grid */
        .month-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            background: var(--color-border);
            gap: 1px;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-lg);
            overflow: hidden;
        }

        .month-header-cell {
            background: var(--color-bg-secondary);
            padding: 8px;
            text-align: center;
            font-weight: 600;
            font-size: 0.85rem;
            color: var(--color-text-secondary);
        }

        .month-cell {
            background: var(--color-bg-main);
            min-height: 100px;
            padding: 4px;
            display: flex;
            flex-direction: column;
        }
        
        .month-cell.other-month {
            background: var(--color-bg-secondary); 
            background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.02) 10px, rgba(0,0,0,0.02) 20px);
        }
        
        .month-cell.is-today {
           background: var(--color-bg-highlight);
        }

        .month-date-label {
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--color-text-secondary);
            margin-bottom: 4px;
            text-align: right;
        }

        .is-today .month-date-label {
            color: var(--color-primary);
        }

        .month-cell-content {
            display: flex;
            flex-direction: column;
            gap: 2px;
            flex: 1;
        }

        .month-slot-bar {
            font-size: 0.7rem;
            background: #e0f2fe; /* Light Blue */
            color: #0369a1;
            padding: 2px 4px;
            border-radius: 3px;
            display: flex; align-items: center; gap: 4px;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .slot-dot { width: 4px; height: 4px; border-radius: 50%; background: currentColor; }

        .month-event-bar {
            font-size: 0.7rem;
            background: var(--color-bg-secondary);
            color: var(--color-text-secondary);
            padding: 1px 4px;
            border-radius: 2px;
             white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .more-events { font-size: 0.7rem; color: var(--color-text-tertiary); padding-left: 4px; }
      `}</style>
    </div>
  );
}
