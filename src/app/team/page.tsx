"use client";

import { useState, useEffect, Suspense } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { useSearchParams, useRouter } from 'next/navigation';
import MultiUserSearch from '@/components/team/MultiUserSearch';
import toast from 'react-hot-toast';
import UserCalendarColumn from '@/components/team/UserCalendarColumn';
import SmartSuggestionsPanel from '@/components/smart-scheduling/SmartSuggestionsPanel';
import TeamHeatmap from '@/components/team/TeamHeatmap';

interface User {
  id: string;
  name: string;
  image: string | null;
  title: string | null;
  department: string | null;
  status: string;
  timeZone?: string;
}

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  color?: string;
  status?: string; // Add status to event
}

function TeamCalendarContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rescheduleId = searchParams.get('reschedule');

  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [userEvents, setUserEvents] = useState<Record<string, Event[]>>({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'heatmap'>('calendar');

  const [rescheduleEvent, setRescheduleEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (rescheduleId) {
      // Fetch event to reschedule
      fetch(`/api/events/${rescheduleId}`).then(res => res.json()).then(originalEvent => {
        setRescheduleEvent(originalEvent);

        const initialUsers: User[] = [];

        // Add Owner first (if available)
        if (originalEvent.owner) {
          initialUsers.push({ ...originalEvent.owner, status: 'available' }); // Default status
        }

        // Add Participants
        if (originalEvent.participants && originalEvent.participants.length > 0) {
          originalEvent.participants.forEach((p: any) => {
            if (p.user && !initialUsers.find(u => u.id === p.user.id)) {
              initialUsers.push({ ...p.user, status: 'available' });
            }
          });
        }

        // Filter out current user if they are already in the list to avoid redundancy? 
        // No, maybe keep them to see own schedule alongside? 
        // Usually you want to see yourself + others. 
        // If the list is empty (just me), rely on default behavior? 
        // But for reschedule, seeing everyone including me is good.

        if (initialUsers.length > 0) {
          setSelectedUsers(initialUsers.slice(0, 4)); // Limit to 4 for UI consistency
        }
      });
    }
  }, [rescheduleId]);

  const handleAddUser = (user: User) => {
    if (selectedUsers.length < 4 && !selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
    // Optional: cleanup events for removed user
    const newEvents = { ...userEvents };
    delete newEvents[userId];
    setUserEvents(newEvents);
  };

  // Fetch events for selected users
  useEffect(() => {
    const fetchEventsForUsers = async () => {
      const usersToFetch = selectedUsers.filter(u => !userEvents[u.id]);

      if (usersToFetch.length === 0) return;

      const newEventsMap = { ...userEvents };
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 7);

      await Promise.all(usersToFetch.map(async (user) => {
        try {
          const res = await fetch(`/api/events?userId=${user.id}&start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`);
          if (res.ok) {
            const events = await res.json();
            newEventsMap[user.id] = events;
          }
        } catch (error) {
          console.error(`Failed to fetch events for ${user.name}`, error);
        }
      }));

      setUserEvents(newEventsMap);
    };

    fetchEventsForUsers();
  }, [selectedUsers, currentDate]);

  const columnWidth = selectedUsers.length > 0 ? 100 / selectedUsers.length : 100;

  // Custom slot click handler for reschedule mode
  const handleRescheduleProposal = async (startTime: Date) => {
    if (!rescheduleId) return;

    toast((t) => (
      <span>
        Propose rescheduling to <b>{format(startTime, 'PP p')}</b>?
        <br />
        <button
          onClick={() => {
            toast.dismiss(t.id);
            handleConfirmReschedule(startTime);
          }}
          style={{
            marginTop: '8px',
            padding: '4px 12px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Confirm
        </button>
        <button
          onClick={() => toast.dismiss(t.id)}
          style={{
            marginTop: '8px',
            marginLeft: '8px',
            padding: '4px 12px',
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </span>
    ), { duration: 5000 });
  };

  const handleConfirmReschedule = async (startTime: Date) => {
    try {
      // Create Proposal
      await fetch(`/api/events/${rescheduleId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: startTime.toISOString(),
          endTime: new Date(startTime.getTime() + 60 * 60 * 1000).toISOString(), // Default 1 hr
          note: 'Rescheduled via Team Calendar'
        })
      });
      toast.success('Proposal Sent!');
      router.push('/'); // Go back home
    } catch (e) {
      toast.error('Failed to propose time');
    }
  };

  return (
    <div className="team-page">
      {rescheduleId && (
        <div className="reschedule-banner">
          <strong>Reschedule Mode</strong>: Select a time slot below to propose a new time for "{rescheduleEvent?.title || 'Meeting'}".
          <button onClick={() => router.push('/')}>Cancel</button>
        </div>
      )}
      <div className="team-header flex justify-between items-center">
        <MultiUserSearch
          selectedUsers={selectedUsers}
          onAddUser={handleAddUser}
          onRemoveUser={handleRemoveUser}
        />

        <div className="flex flex-row items-center ml-4" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: '8px',
              border: viewMode === 'calendar' ? '2px solid var(--color-text-main)' : '2px solid var(--color-border)',
              backgroundColor: viewMode === 'calendar' ? 'var(--color-bg-main)' : 'transparent',
              color: viewMode === 'calendar' ? 'var(--color-text-main)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none',
            }}
          >
            Calendar
          </button>
          <button
            type="button"
            onClick={() => setViewMode('heatmap')}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: '8px',
              border: viewMode === 'heatmap' ? '2px solid var(--color-text-main)' : '2px solid var(--color-border)',
              backgroundColor: viewMode === 'heatmap' ? 'var(--color-bg-main)' : 'transparent',
              color: viewMode === 'heatmap' ? 'var(--color-text-main)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none',
            }}
          >
            Heatmap
          </button>
        </div>
      </div>

      <div className="team-content">
        {selectedUsers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>Compare Schedules</h3>
            <p>Search for coworkers above to view their calendars side-by-side.</p>
          </div>
        ) : (
          viewMode === 'heatmap' ? (
            <div className="p-6 h-full overflow-y-auto">
              <TeamHeatmap selectedUsers={selectedUsers} currentDate={currentDate} />
            </div>
          ) : (
            <div className="columns-container">
              {selectedUsers.map(user => (
                <div
                  key={user.id}
                  className="column-wrapper"
                  style={{ width: `${columnWidth}%` }}
                >
                  <UserCalendarColumn
                    user={user}
                    events={userEvents[user.id] || []}
                    currentDate={currentDate}
                    columnCount={selectedUsers.length}
                    onSlotClick={rescheduleId ? handleRescheduleProposal : undefined}
                  />
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {viewMode === 'calendar' && (
        <SmartSuggestionsPanel
          selectedUsers={selectedUsers}
          userEvents={userEvents}
        />
      )}


      <style jsx>{`
                .team-page {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: var(--color-bg-secondary);
                }
                
                .reschedule-banner {
                    background: #fffbeb; color: #92400e; padding: 12px 20px;
                    border-bottom: 1px solid #fcd34d; display: flex; justify-content: space-between; align-items: center;
                }
                .reschedule-banner button {
                    background: transparent; border: 1px solid #92400e; color: #92400e;
                    padding: 4px 12px; border-radius: 4px; cursor: pointer;
                }

                .team-header {
                    padding: var(--spacing-lg);
                    border-bottom: 1px solid var(--color-border);
                    background: var(--color-bg-secondary);
                    z-index: 10;
                }

                .team-content {
                    flex: 1;
                    overflow: hidden;
                    position: relative;
                }

                .empty-state {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: var(--color-text-secondary);
                }

                .empty-icon {
                    font-size: 3rem;
                    margin-bottom: var(--spacing-md);
                    opacity: 0.5;
                }

                .columns-container {
                    display: flex;
                    height: 100%;
                    width: 100%;
                }

                .column-wrapper {
                    height: 100%;
                    transition: width 0.3s ease;
                }
            `}</style>
    </div>
  );
}

export default function TeamCalendarPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TeamCalendarContent />
    </Suspense>
  );
}
