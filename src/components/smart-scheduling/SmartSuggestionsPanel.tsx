
import React, { useEffect, useState } from 'react';
import {
    findBestTimeSlots,
    UserCalendar,
    SmartSuggestions,
    TimeSlot
} from '@/lib/smart-scheduling';
import SuggestionCard from './SuggestionCard';
import MeetingRequestForm from './MeetingRequestForm';

interface User {
    id: string;
    name: string;
    image: string | null;
}

interface Event {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
}

interface SmartSuggestionsPanelProps {
    selectedUsers: User[];
    userEvents: Record<string, Event[]>;
}

export default function SmartSuggestionsPanel({ selectedUsers, userEvents }: SmartSuggestionsPanelProps) {
    const [suggestions, setSuggestions] = useState<SmartSuggestions | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [selectedDuration, setSelectedDuration] = useState<number>(0);
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Run algorithm when users/events change
    useEffect(() => {
        if (selectedUsers.length < 2) return;

        setLoading(true);
        // Add small delay to visualize "Analyzing..." if super fast
        const timer = setTimeout(() => {
            const calendars: UserCalendar[] = selectedUsers.map(user => ({
                userId: user.id,
                events: userEvents[user.id] || []
            }));

            const results = findBestTimeSlots(calendars);
            setSuggestions(results);
            setLoading(false);
        }, 800);

        return () => clearTimeout(timer);
    }, [selectedUsers, userEvents]);

    const handleSelectSlot = (slot: TimeSlot, duration: number) => {
        setSelectedSlot(slot);
        setSelectedDuration(duration);
        setIsFormOpen(true);
    };

    const handleFormSubmit = () => {
        setIsFormOpen(false);
        setSelectedSlot(null);
        // In real app, we would refresh events here
    };

    if (selectedUsers.length < 2) return null;

    return (
        <div className="smart-panel-container">
            <div className="panel-header">
                <h2>🎯 SMART TIME SUGGESTIONS</h2>
                {loading && <span className="analyzing-text">Analyzing {selectedUsers.length} calendars...</span>}
            </div>

            {loading ? (
                <div className="loading-state">
                    <div className="progress-bar-container">
                        <div className="progress-bar-fill" />
                    </div>
                    <p>Finding best times for 15, 30, and 60 minute meetings...</p>
                </div>
            ) : suggestions ? (
                <div className="suggestions-grid">
                    <div className="duration-row">
                        <div className="row-label">
                            <span className="icon">⚡</span> 15-MINUTE MEETINGS
                        </div>
                        <div className="cards-wrapper">
                            {suggestions.fifteenMinSlots.map((slot, i) => (
                                <SuggestionCard
                                    key={i}
                                    slot={slot}
                                    userCount={selectedUsers.length}
                                    durationMinutes={15}
                                    onSelect={(s) => handleSelectSlot(s, 15)}
                                />
                            ))}
                            {suggestions.fifteenMinSlots.length === 0 && <EmptySlot />}
                        </div>
                    </div>

                    <div className="duration-row">
                        <div className="row-label">
                            <span className="icon">⏰</span> 30-MINUTE MEETINGS
                        </div>
                        <div className="cards-wrapper">
                            {suggestions.thirtyMinSlots.map((slot, i) => (
                                <SuggestionCard
                                    key={i}
                                    slot={slot}
                                    userCount={selectedUsers.length}
                                    durationMinutes={30}
                                    onSelect={(s) => handleSelectSlot(s, 30)}
                                />
                            ))}
                            {suggestions.thirtyMinSlots.length === 0 && <EmptySlot />}
                        </div>
                    </div>

                    <div className="duration-row">
                        <div className="row-label">
                            <span className="icon">📅</span> 1-HOUR MEETINGS
                        </div>
                        <div className="cards-wrapper">
                            {suggestions.sixtyMinSlots.map((slot, i) => (
                                <SuggestionCard
                                    key={i}
                                    slot={slot}
                                    userCount={selectedUsers.length}
                                    durationMinutes={60}
                                    onSelect={(s) => handleSelectSlot(s, 60)}
                                />
                            ))}
                            {suggestions.sixtyMinSlots.length === 0 && <EmptySlot />}
                        </div>
                    </div>
                </div>
            ) : null}

            <MeetingRequestForm
                isOpen={isFormOpen}
                selectedSlot={selectedSlot}
                durationMinutes={selectedDuration}
                users={selectedUsers}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleFormSubmit}
            />

            .smart-panel-container {
                position: fixed;
            bottom: 0;
            right: 0;
            left: 280px;
            height: 380px;
            background: var(--color-bg-main); /* FIX: Use variable */
            border-top: 2px solid var(--color-accent);
            box-shadow: 0 -4px 20px rgba(0,0,0,0.2);
            z-index: 100;
            padding: 24px 32px;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
                }

            @media (max-width: 768px) {
                    .smart - panel - container {left: 0; height: 300px; padding: 16px; }
                }

            .panel-header {
                display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
                }

            .panel-header h2 {
                font - size: 1rem;
            font-weight: 700;
            letter-spacing: 0.5px;
            color: var(--color-text-main); /* FIX: Use variable */
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
                }

            .analyzing-text {
                font - size: 0.9rem;
            color: var(--color-text-secondary); /* FIX: Use variable */
            font-style: italic;
            animation: pulse 1.5s infinite;
                }

            @keyframes pulse {0 % { opacity: 0.6; } 50% {opacity: 1; } 100% {opacity: 0.6; } }

            .suggestions-grid {
                display: flex;
            gap: 24px;
            overflow-x: auto;
            padding-bottom: 10px;
                }

            .duration-row {
                flex: 1;
            min-width: 300px;
            display: flex;
            flex-direction: column;
            gap: 12px;
                }

            .row-label {
                font - size: 0.8rem;
            font-weight: 700;
            color: var(--color-text-secondary); /* FIX: Use variable */
            display: flex;
            align-items: center;
            gap: 6px;
            text-transform: uppercase;
                }

            .cards-wrapper {
                display: flex;
            flex-direction: column;
            gap: 12px;
                }

            .loading-state {
                flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: var(--color-text-secondary);
                }

            .progress-bar-container {
                width: 300px;
            height: 6px;
            background: var(--color-bg-secondary);
            border-radius: 3px;
            overflow: hidden;
            margin-bottom: 16px;
                }

            .progress-bar-fill {
                height: 100%;
            background: linear-gradient(90deg, var(--color-accent), var(--color-secondary-brand));
            width: 50%;
            animation: loading 1.5s infinite ease-in-out;
                }

            @keyframes loading {
                0 % { width: 0 %; transform: translateX(-100 %); }
                    100% {width: 100%; transform: translateX(100%); }
                }
            `}</style>
        </div >
    );
}

function EmptySlot() {
    return (
        <div className="empty-slot">
            No common time found
            <style jsx>{`
                .empty-slot {
                    padding: 20px;
                    background: #f5f5f5;
                    border: 1px dashed #ccc;
                    border-radius: 8px;
                    color: #999;
                    font-size: 0.9rem;
                    text-align: center;
                }
            `}</style>
        </div>
    );
}
