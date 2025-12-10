"use client";

import { useState, useEffect, Suspense } from 'react';
import { format, startOfWeek, addDays, subWeeks, addWeeks, startOfMonth, endOfMonth, endOfWeek, isSameDay } from 'date-fns';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MultiUserSearch from '@/components/team/MultiUserSearch';
import toast from 'react-hot-toast';
import UserCalendarColumn from '@/components/team/UserCalendarColumn';
import SmartSuggestionsPanel from '@/components/smart-scheduling/SmartSuggestionsPanel';
import TeamHeatmap from '@/components/team/TeamHeatmap';
import UserMonthCalendar from '@/components/team/UserMonthCalendar';
import CreateTeamEventModal from '@/components/team/CreateTeamEventModal';

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

  // State Split: 'timeView' (Scope) vs 'contentView' (Visualization)
  const [timeView, setTimeView] = useState<'week' | 'month'>('week');
  const [contentView, setContentView] = useState<'calendar' | 'heatmap'>('calendar');

  const [rescheduleEvent, setRescheduleEvent] = useState<Event | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [draftStartTime, setDraftStartTime] = useState<Date | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
      const usersToFetch = selectedUsers; // Always refresh when date changes

      if (usersToFetch.length === 0) return;

      const newEventsMap = { ...userEvents }; // Keep existing (maybe cache?) or clear? Let's keep and overwrite.

      let start, end;
      if (timeView === 'month') {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        start = startOfWeek(monthStart, { weekStartsOn: 1 });
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        end = endOfWeek(monthEnd, { weekStartsOn: 1 });
      } else {
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = addDays(start, 7);
      }

      await Promise.all(usersToFetch.map(async (user) => {
        try {
          // Check if we already have events for this user/range? 
          // Simple implementation: just fetch.
          const res = await fetch(`/api/events?userId=${user.id}&start=${start.toISOString()}&end=${end.toISOString()}`);
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
  }, [selectedUsers, currentDate, timeView, refreshTrigger]);

  const handleSlotClick = (startTime: Date) => {
    if (rescheduleId) {
      handleRescheduleProposal(startTime);
    } else {
      setDraftStartTime(startTime);
      setCreateModalOpen(true);
    }
  };

  const handleCreateTeamMeeting = async (title: string, start: Date, end: Date) => {
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: 'Scheduled via Team Calendar',
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          locationType: 'VIDEO',
          attendees: selectedUsers.map(u => u.id)
        })
      });

      if (!res.ok) throw new Error('Failed to create meeting');

      toast.success('Meeting Scheduled!');
      setRefreshTrigger(v => v + 1);
    } catch (e) {
      toast.error('Failed to schedule meeting');
      console.error(e);
    }
  };

  const handlePrev = () => {
    if (timeView === 'month') setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    else setCurrentDate(subWeeks(currentDate, 1));
  };
  const handleNext = () => {
    if (timeView === 'month') setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    else setCurrentDate(addWeeks(currentDate, 1));
  };
  const handleToday = () => setCurrentDate(new Date());

  // Month Grid Gen
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  // Calculate dates for grid: handled by sub-components now
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
      <div className="team-header">
        <MultiUserSearch
          selectedUsers={selectedUsers}
          onAddUser={handleAddUser}
          onRemoveUser={handleRemoveUser}
        />

        <div className="header-controls">
          {/* Date Nav */}
          <div className="date-nav-group">
            <button onClick={handlePrev} className="nav-icon-btn">
              <ChevronLeft size={20} />
            </button>
            <button onClick={handleToday} className="nav-today-btn">
              Today
            </button>
            <button onClick={handleNext} className="nav-icon-btn">
              <ChevronRight size={20} />
            </button>
          </div>

          <span className="current-date-label">
            {timeView === 'week' ? format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMMM yyyy') : format(currentDate, 'MMMM yyyy')}
          </span>

          <div className="view-toggles-group">
            <button
              onClick={() => setTimeView('week')}
              className={`toggle-btn ${timeView === 'week' ? 'active' : ''}`}
            >
              Week
            </button>
            <button
              onClick={() => setTimeView('month')}
              className={`toggle-btn ${timeView === 'month' ? 'active' : ''}`}
            >
              Month
            </button>
            <div className="vertical-divider"></div>
            <button
              onClick={() => setContentView('calendar')}
              className={`toggle-btn ${contentView === 'calendar' ? 'active' : ''}`}
            >
              Calendar
            </button>
            <button
              onClick={() => setContentView('heatmap')}
              className={`toggle-btn ${contentView === 'heatmap' ? 'active' : ''}`}
            >
              Heatmap
            </button>
          </div>
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
          contentView === 'heatmap' ? (
            <div className="p-6 h-full overflow-y-auto">
              {/* Pass timeView prop to support Month Heatmap */}
              <TeamHeatmap
                selectedUsers={selectedUsers}
                currentDate={currentDate}
                timeView={timeView}
                onSlotClick={handleSlotClick}
              />
            </div>
          ) : timeView === 'month' ? (
            <div className="month-columns-container h-full overflow-x-auto">
              <div className="flex h-full gap-4 p-4 min-w-full w-fit">
                {selectedUsers.map(user => (
                  <div key={user.id} className="flex-1 min-w-[350px] max-w-[500px] h-full">
                    <UserMonthCalendar
                      user={user}
                      events={userEvents[user.id] || []}
                      currentDate={currentDate}
                      onSlotClick={handleSlotClick}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="columns-container">
              {/* Week View Implementation */}
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
                    onSlotClick={handleSlotClick}
                  />
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <CreateTeamEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onConfirm={handleCreateTeamMeeting}
        initialDate={draftStartTime}
        participants={selectedUsers}
      />

      {contentView === 'calendar' && timeView === 'week' && (
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
                    padding: var(--spacing-lg); /* Ensure even padding around */
                    border-bottom: 1px solid var(--color-border);
                    background: var(--color-bg-secondary);
                    z-index: 10;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem; /* Space between Search and Controls */
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

                .vertical-divider {
                    width: 1px;
                    height: 24px;
                    background: var(--color-border);
                    margin: 0 4px;
                }

                /* Header Controls Styling */
                .header-controls {
                    display: flex;
                    align-items: center;
                    justify-content: center; /* Center the controls row */
                    gap: 1.5rem;
                    /* margin-left removed for vertical stacking alignment */
                    width: 100%; /* Ensure it takes full width for centering */
                }

                .date-nav-group {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: var(--color-bg-main);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    padding: 4px;
                }

                .nav-icon-btn, .nav-today-btn {
                    background: transparent;
                    border: none;
                    color: var(--color-text-secondary);
                    cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    border-radius: 4px;
                    transition: all 0.2s;
                }
                .nav-icon-btn { padding: 4px; }
                .nav-today-btn { padding: 4px 12px; font-weight: 600; font-size: 0.9rem; }
                
                .nav-icon-btn:hover, .nav-today-btn:hover {
                    background: var(--color-bg-secondary);
                    color: var(--color-text-main);
                }

                .current-date-label {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: var(--color-text-main);
                    min-width: 150px;
                }

                .view-toggles-group {
                    display: flex;
                    gap: 8px;
                }

                .toggle-btn {
                    padding: 6px 16px;
                    font-size: 0.9rem;
                    font-weight: 500;
                    border-radius: var(--radius-md);
                    border: 1px solid var(--color-border);
                    background: var(--color-bg-main);
                    color: var(--color-text-secondary);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .toggle-btn:hover {
                    border-color: var(--color-text-secondary);
                    color: var(--color-text-main);
                }

                .toggle-btn.active {
                    border-color: var(--color-accent);
                    color: var(--color-accent);
                    background: var(--color-bg-highlight); /* Subtle tint */
                    font-weight: 600;
                    box-shadow: 0 0 0 1px var(--color-accent);
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
