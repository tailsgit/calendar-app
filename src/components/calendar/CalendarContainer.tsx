"use client";

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast'; // Import Toast
import CalendarHeader from './CalendarHeader';
import WeekView from './WeekView';
import MonthView from './MonthView';
import DayView from './DayView';
import Modal from '../ui/Modal';
import NewMeetingForm from '../meeting/NewMeetingForm';
import EventModal from './EventModal';
import MeetingObjectDetail from '../meeting/MeetingObjectDetail';
import { useClipboard } from '../../context/ClipboardContext';

interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  locationType?: string;
  color: string;
  recurrence?: string;
  status?: string;
  ownerId?: string;
  participants?: any[];
  attendees?: string[];
}

export default function CalendarContainer() {
  const { data: session } = useSession();
  const { clipboardEvents, copyEvent: globalCopyEvent, clearClipboard } = useClipboard();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventModalMode, setEventModalMode] = useState<'view' | 'edit' | 'create'>('view');

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; date: Date } | null>(null);

  const [selectedObject, setSelectedObject] = useState<Event | null>(null);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Failed to fetch events', error);
    }
  };

  const handleReschedule = async (event: Event, newStart: Date) => {
    // Calculate new end time based on duration
    const durationMs = new Date(event.endTime).getTime() - new Date(event.startTime).getTime();
    const newEnd = new Date(newStart.getTime() + durationMs);

    const updatedEvent = {
      ...event,
      startTime: newStart.toISOString(),
      endTime: newEnd.toISOString(),
    };

    try {
      await handleSaveEvent(updatedEvent);
      toast.success('Event rescheduled');
    } catch (error) {
      toast.error('Failed to reschedule');
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveEvent = async (eventData: Event) => {
    try {
      const method = eventData.id ? 'PUT' : 'POST';
      const url = eventData.id ? `/api/events/${eventData.id}` : '/api/events';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (res.ok) {
        await fetchEvents();
        setIsModalOpen(false);
        setSelectedEvent(null);
        toast.success(eventData.id ? 'Event updated' : 'Event created');
      } else {
        throw new Error('Failed to save event');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to save event');
      throw error;
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setEvents(events.filter(e => e.id !== eventId));
        setSelectedEvent(null);
        toast.success('Event deleted');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete event');
    }
  };

  // New Meeting Form Initial State
  const [newMeetingInitialState, setNewMeetingInitialState] = useState<{ date: Date | null, time: string }>({ date: null, time: '' });

  const onSlotClick = (date: Date) => {
    setNewMeetingInitialState({
      date: date,
      time: format(date, 'HH:mm')
    });
    setIsModalOpen(true);
  };

  const onEventClick = (event: any) => {
    setSelectedEvent(event);
    setEventModalMode('view');
  };

  const handleRespond = async (eventId: string, action: 'accept' | 'decline') => {
    try {
      const res = await fetch(`/api/events/${eventId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        toast.success(`You ${action}ed the event`);
        setSelectedEvent(null);
        await fetchEvents();
      }
    } catch (e) {
      toast.error('Failed to respond');
    }
  };

  // Clipboard Functions
  const handleCopyEvent = (event: Event) => {
    globalCopyEvent(event);
    // Optional: Close modal if open? context.copyEvent already toasts.
  };

  const handleDayContextMenu = (e: React.MouseEvent, date: Date) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, date });
  };

  const pasteEventsToDate = async () => {
    if (!contextMenu || clipboardEvents.length === 0) return;
    const targetDate = contextMenu.date;

    try {
      const promises = clipboardEvents.map(event => {
        const originalStart = new Date(event.startTime);
        const originalEnd = new Date(event.endTime);
        const duration = originalEnd.getTime() - originalStart.getTime();

        const newStartTime = new Date(targetDate);
        newStartTime.setHours(originalStart.getHours(), originalStart.getMinutes());

        const newEndTime = new Date(newStartTime.getTime() + duration);

        return handleSaveEvent({
          ...event,
          id: '', // Ensure new ID for creation
          title: `${event.title} (Copy)`,
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
        });
      });

      await Promise.all(promises);
      toast.success(`Pasted ${clipboardEvents.length} events to ${format(targetDate, 'MMM d')}`);
      clearClipboard();
      setContextMenu(null);
    } catch (error) {
      console.error("Paste failed", error);
      toast.error("Failed to paste events");
    }
  };


  return (
    <div className="calendar-container">
      <CalendarHeader
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        viewMode={viewMode}
        onViewChange={setViewMode}
        onNewMeeting={() => {
          setNewMeetingInitialState({ date: new Date(), time: format(new Date(), 'HH:mm') });
          setIsModalOpen(true);
        }}
        onToday={() => setCurrentDate(new Date())}
      />

      <div className="calendar-view-content flex-1 overflow-hidden relative">
        {viewMode === 'day' && (
          <DayView
            currentDate={currentDate}
            events={events}
            onTimeSlotClick={(date, hour) => {
              const d = new Date(date);
              d.setHours(hour);
              onSlotClick(d);
            }}
            onEventClick={onEventClick}
            onEventContextMenu={(e, event) => {
              e.preventDefault();
              e.stopPropagation();
              globalCopyEvent(event);
            }}
            onDayContextMenu={handleDayContextMenu}
          />
        )}
        {viewMode === 'week' && (
          <WeekView
            currentDate={currentDate}
            events={events}
            onTimeSlotClick={(date, hour) => {
              const d = new Date(date);
              d.setHours(hour);
              onSlotClick(d);
            }}
            onEventClick={onEventClick}
            onDayContextMenu={handleDayContextMenu}
            onEventContextMenu={(e, event) => {
              e.preventDefault();
              e.stopPropagation();
              globalCopyEvent(event);
            }}
          />
        )}
        {viewMode === 'month' && (
          <MonthView
            currentDate={currentDate}
            events={events}
            onDateClick={(date) => {
              setNewMeetingInitialState({ date, time: '09:00' });
              setIsModalOpen(true);
            }}
            onEventClick={onEventClick}
          />
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New Meeting"
      >
        <NewMeetingForm
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSaveEvent}
          initialDate={newMeetingInitialState.date ? format(newMeetingInitialState.date, 'yyyy-MM-dd') : undefined}
          initialTime={newMeetingInitialState.time}
        />
      </Modal>

      <EventModal
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        mode={eventModalMode}
        currentUserId={session?.user?.id}
        onRespond={handleRespond}
        onCopy={handleCopyEvent}
      />

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <button
            className="menu-item"
            onClick={pasteEventsToDate}
            disabled={clipboardEvents.length === 0}
          >
            Paste Events ({clipboardEvents.length})
          </button>
          <button
            className="menu-item cancel"
            onClick={() => setContextMenu(null)}
          >
            Cancel
          </button>
        </div>
      )}


      <style jsx>{`
        .calendar-container {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .context-menu {
          position: fixed;
          background: white;
          border: 1px solid var(--color-border);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border-radius: 8px;
          padding: 4px 0;
          z-index: 9999;
          min-width: 150px;
        }

        .menu-item {
          display: block;
          width: 100%;
          text-align: left;
          padding: 8px 12px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.9rem;
          color: var(--color-text-main);
        }
        .menu-item:hover:not(:disabled) {
          background-color: var(--color-bg-secondary);
        }
        .menu-item:disabled {
          color: var(--color-text-secondary);
          cursor: not-allowed;
          opacity: 0.6;
        }
        .menu-item.cancel {
          border-top: 1px solid var(--color-border);
          color: var(--color-text-secondary);
        }
      `}</style>
    </div>
  );
}
