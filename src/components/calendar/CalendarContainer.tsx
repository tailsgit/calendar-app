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
}

export default function CalendarContainer() {
  const { data: session } = useSession();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventModalMode, setEventModalMode] = useState<'view' | 'edit' | 'create'>('view');

  const [selectedObject, setSelectedObject] = useState<Event | null>(null);

  const handleReschedule = async (event: Event, newStart: Date) => {
    // Calculate new end time based on duration
    const durationMs = new Date(event.endTime).getTime() - new Date(event.startTime).getTime();
    const newEnd = new Date(newStart.getTime() + durationMs);

    const updatedEvent = {
      ...event,
      startTime: newStart.toISOString(),
      endTime: newEnd.toISOString()
    };

    await handleSaveEvent(updatedEvent);
    toast.success('Event moved successfully');
  };

  const fetchEvents = useCallback(async () => {
    try {
      // Determine range based on current view/date
      const start = new Date(currentDate);
      start.setMonth(start.getMonth() - 1);
      const end = new Date(currentDate);
      end.setMonth(end.getMonth() + 1);

      // Fetch local events
      const resLocal = await fetch(`/api/events?start=${start.toISOString()}&end=${end.toISOString()}`);
      let localEvents = [];
      if (resLocal.ok) {
        localEvents = await resLocal.json();
      }

      // Fetch Google events (parallel-ish, but isolated)
      let googleEvents = [];
      try {
        const resGoogle = await fetch(`/api/events/google?start=${start.toISOString()}&end=${end.toISOString()}`);
        if (resGoogle.ok) {
          googleEvents = await resGoogle.json();
        } else if (resGoogle.status === 401 || resGoogle.status === 404) {
          // User not connected or unauthorized - ignore
          googleEvents = [];
        } else {
          console.error('Google fetch failed', await resGoogle.text());
        }
      } catch (err) {
        console.error('Google fetch error', err);
      }

      // Fetch Outlook events
      let outlookEvents = [];
      try {
        const resOutlook = await fetch(`/api/events/outlook?start=${start.toISOString()}&end=${end.toISOString()}`);
        if (resOutlook.ok) {
          outlookEvents = await resOutlook.json();
        } else if (resOutlook.status === 401 || resOutlook.status === 404) {
          // User not connected or unauthorized - ignore
          outlookEvents = [];
        } else {
          console.error('Outlook fetch failed', await resOutlook.text());
        }
      } catch (err) {
        console.error('Outlook fetch error', err);
      }

      // Merge events
      const mergedEvents = [
        ...localEvents,
        ...googleEvents.map((e: any) => ({
          ...e,
          startTime: e.start, // Map start -> startTime
          endTime: e.end,     // Map end -> endTime
          color: '#4285F4', // Google Blue
          isExternal: true,
          source: 'google'
        })),
        ...outlookEvents.map((e: any) => ({
          ...e,
          startTime: e.start, // Map start -> startTime
          endTime: e.end,     // Map end -> endTime
          color: '#0078D4', // Outlook Blue
          isExternal: true,
          source: 'outlook'
        }))
      ];

      setEvents(mergedEvents);
    } catch (error) {
      console.error('Failed to fetch events', error);
      toast.error('Failed to sync calendar');
    }
  }, [currentDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleToday = () => setCurrentDate(new Date());

  const handleEventClick = (event: Event) => {
    // Always open the unified EventModal
    setSelectedEvent(event);
    setEventModalMode('view');
  };

  const handleDateClick = (date: Date) => {
    setCurrentDate(date);
    setViewMode('day');
  };

  const handleRespond = async (id: string, action: 'accept' | 'decline') => {
    // Note: id passed here is actually Event ID from EventModal
    // We need to find the Participant record for ME in this event to respond correctly.
    // The previous MeetingObjectDetail passed Meeting ID but expected Participant ID in API call?
    // Let's re-verify logic. 
    // CalendarContainer's handleRespond logic was:
    /*
    const myParticipant = selectedObject.participants?.find((p: any) => p.userId === user.id || p.email === user.email);
    if (myParticipant) ... call API with myParticipant.id
    */

    // We need to adapt this to work with `selectedEvent` instead of `selectedObject`.
    const targetEvent = selectedEvent || events.find(e => e.id === id); // `id` passed from Modal is event.id
    const user = session?.user;

    if (!user?.id || !targetEvent) return;

    const myParticipant = targetEvent.participants?.find((p: any) => p.userId === user.id || p.email === user.email);

    if (myParticipant) {
      try {
        const res = await fetch('/api/user/requests/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: myParticipant.id,
            type: 'event_invite',
            action
          })
        });

        if (res.ok) {
          toast.success('Responded successfully');
          setSelectedEvent(null); // Close modal
          fetchEvents();
        } else {
          toast.error('Failed to respond');
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      console.log('Not a participant, cannot respond directly');
      toast.error('You are not a participant');
    }
  };

  const handleSaveEvent = async (event: Event) => {
    const method = event.id ? 'PUT' : 'POST';
    const url = event.id ? `/api/events/${event.id}` : '/api/events';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    if (res.ok) {
      fetchEvents();
    } else {
      const data = await res.json();
      throw new Error(data.error || 'Failed to save event');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const res = await fetch(`/api/events/${eventId}`, { method: 'DELETE' });
    if (res.ok) {
      fetchEvents();
    } else {
      throw new Error('Failed to delete event');
    }
  };

  const [newMeetingInitialState, setNewMeetingInitialState] = useState<{ date?: string; time?: string }>({});

  const handleTimeSlotClick = (date: Date, hour: number) => {
    setNewMeetingInitialState({
      date: format(date, 'yyyy-MM-dd'),
      time: `${String(hour).padStart(2, '0')}:00`
    });
    setIsModalOpen(true);
  };

  return (
    <div className="calendar-container">
      {/* ... (headers and views) ... */}
      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onViewChange={setViewMode}
        onDateChange={setCurrentDate}
        onToday={handleToday}
        onNewMeeting={() => {
          setNewMeetingInitialState({});
          setIsModalOpen(true);
        }}
      />

      {viewMode === 'week' && (
        <WeekView
          currentDate={currentDate}
          events={events}
          onEventClick={handleEventClick}
          onTimeSlotClick={handleTimeSlotClick}
        />
      )}

      {viewMode === 'day' && (
        <DayView
          currentDate={currentDate}
          events={events}
          onEventClick={handleEventClick}
          onTimeSlotClick={handleTimeSlotClick}
        />
      )}

      {viewMode === 'day' && (
        <DayView
          currentDate={currentDate}
          events={events}
          onEventClick={handleEventClick}
          onTimeSlotClick={handleTimeSlotClick}
        />
      )}
      {viewMode === 'month' && (
        <MonthView
          currentDate={currentDate}
          events={events}
          onEventClick={handleEventClick}
          onDateClick={handleDateClick}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule New Meeting"
      >
        <NewMeetingForm
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchEvents}
          initialDate={newMeetingInitialState.date}
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
      />


      <style jsx>{`
        .calendar-container {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </div>
  );
}

