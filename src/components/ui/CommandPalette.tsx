"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from './Modal';
import NewMeetingForm from '../meeting/NewMeetingForm';
import VoiceInput from './VoiceInput';
import { X } from 'lucide-react';

export default function CommandPalette() {
    const [open, setOpen] = useState(false);

    // State for Smart Create Modal (New Meeting Form)
    const [smartCreateOpen, setSmartCreateOpen] = useState(false);
    const [smartData, setSmartData] = useState<{ date?: Date, endDate?: Date, title?: string, description?: string, location?: string, attendees?: any[] }>({});

    const router = useRouter();
    const [lastCreatedEvent, setLastCreatedEvent] = useState<any>(null);

    // Toggle with Cmd+K
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const handleVoiceResult = async (data: { title: string, start: Date, end?: Date, description?: string, location?: string, attendees?: any[], isUpdate?: boolean, isDelete?: boolean }) => {
        // --- DELETION LOGIC ---
        if (data.isDelete) {
            // Case 1: Contextual ("Cancel that")
            if (lastCreatedEvent && /\b(that|it|meeting|event)\b/i.test(data.title)) {
                try {
                    const res = await fetch(`/api/events/${lastCreatedEvent.id}`, { method: 'DELETE' });
                    if (res.ok) {
                        setLastCreatedEvent(null);
                        setOpen(false);
                        router.refresh();
                        // Ideally show toast here
                        return;
                    }
                } catch (e) {
                    console.error("Failed to delete context event", e);
                }
            }

            // Case 2: Specific ("Cancel Lunch with Bob")
            // We need to find the event first.
            try {
                // Fetch events for the target day
                const startOfDay = new Date(data.start);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(startOfDay);
                endOfDay.setHours(23, 59, 59, 999);

                const res = await fetch(`/api/events?start=${startOfDay.toISOString()}&end=${endOfDay.toISOString()}`);
                if (res.ok) {
                    const events = await res.json();
                    // Fuzzy match title
                    const fuse = (await import('fuse.js')).default;
                    const f = new fuse(events, { keys: ['title'], threshold: 0.4 });
                    const results = f.search(data.title);

                    if (results.length > 0) {
                        const targetEvent = results[0].item as any;
                        // Delete it
                        const delRes = await fetch(`/api/events/${targetEvent.id}`, { method: 'DELETE' });
                        if (delRes.ok) {
                            setOpen(false);
                            router.refresh();
                            return;
                        }
                    } else {
                        // Notify user nothing found?
                        console.log("No matching event found to delete");
                    }
                }
            } catch (e) {
                console.error("Failed to specific delete", e);
            }
            return;
        }

        // CONTEXT AWARENESS: "Move that" logic
        if (data.isUpdate && lastCreatedEvent) {
            // Update the last created event
            try {
                // We assume 'start' is the new start time. We preserve duration if end not explicit?
                // VoiceInput usually calculates end from default duration if not specified, 
                // but for updates, we might want to keep original duration if user just said "Move to 5pm".
                // For simplicity, let's use the provided start/end from VoiceInput which likely defaults to 1h if not parsed.
                // Improvement: If VoiceInput didn't find specific end, calculate from lastCreatedEvent duration.

                const response = await fetch(`/api/events/${lastCreatedEvent.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: lastCreatedEvent.title, // Keep title
                        description: lastCreatedEvent.description,
                        startTime: data.start.toISOString(),
                        endTime: data.end ? data.end.toISOString() : new Date(data.start.getTime() + (new Date(lastCreatedEvent.endTime).getTime() - new Date(lastCreatedEvent.startTime).getTime())).toISOString(),
                        locationType: lastCreatedEvent.locationType,
                        recurrence: lastCreatedEvent.recurrence
                    })
                });

                if (response.ok) {
                    const updated = await response.json();
                    setLastCreatedEvent(updated);
                    router.refresh();
                    setOpen(false);
                    // Could show a toast here: "Rescheduled to ..."
                    return;
                }
            } catch (e) {
                console.error("Failed to update context event", e);
            }
        }

        // Standard Create Flow
        setSmartData({
            title: data.title,
            date: data.start,
            endDate: data.end,
            description: data.description,
            location: data.location,
            attendees: data.attendees
        });
        setOpen(false); // Close voice modal
        setSmartCreateOpen(true); // Open event form
    };

    return (
        <>
            {open && (
                <div className="command-backdrop" onClick={() => setOpen(false)}>
                    <div className="command-wrapper" onClick={(e) => e.stopPropagation()}>
                        <div className="header">
                            <h3>Voice Command <span className="shortcut-hint">(⌘K)</span></h3>
                            <button onClick={() => setOpen(false)} className="close-btn">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="content">
                            <p className="hint">Try saying: "Lunch with Sarah tomorrow at noon"</p>
                            <VoiceInput onResult={handleVoiceResult} />
                        </div>
                    </div>
                </div>
            )}

            {/* Smart Create Modal (Reusing NewMeetingForm logic) */}
            <Modal
                isOpen={smartCreateOpen}
                onClose={() => setSmartCreateOpen(false)}
                title="Create Event"
            >
                <NewMeetingForm
                    onClose={() => setSmartCreateOpen(false)}
                    onSuccess={(event) => {
                        if (event) setLastCreatedEvent(event);
                        setSmartCreateOpen(false);
                        router.refresh();
                    }}
                    initialDate={smartData.date ? smartData.date.toISOString().split('T')[0] : undefined}
                    initialTime={smartData.date ? smartData.date.toTimeString().slice(0, 5) : undefined}
                    initialEndTime={smartData.endDate ? smartData.endDate.toTimeString().slice(0, 5) : undefined}
                    initialTitle={smartData.title}
                    initialDescription={smartData.description}
                    initialLocation={smartData.location}
                    initialAttendees={smartData.attendees}
                />
            </Modal>

            <style jsx global>{`
                .command-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.6);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(4px);
                    animation: fadeIn 0.2s ease-out;
                }
                
                .command-wrapper {
                    background: var(--color-bg-main);
                    border-radius: 16px;
                    width: 90%;
                    max-width: 480px;
                    box-shadow: var(--shadow-xl);
                    overflow: hidden;
                    border: 1px solid var(--color-border);
                    position: relative;
                }

                .header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 20px;
                    border-bottom: 1px solid var(--color-border);
                }

                .header h3 {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: var(--color-text-main);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .shortcut-hint {
                    font-size: 0.8rem;
                    color: var(--color-text-secondary);
                    font-weight: 400;
                    background: var(--color-bg-secondary);
                    padding: 2px 6px;
                    border-radius: 4px;
                    border: 1px solid var(--color-border);
                }

                .close-btn {
                    padding: 4px;
                    border-radius: 50%;
                    color: var(--color-text-secondary);
                    transition: all 0.2s;
                }

                .close-btn:hover {
                    background: var(--color-bg-secondary);
                    color: var(--color-text-main);
                }

                .content {
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .hint {
                    color: var(--color-text-secondary);
                    margin-bottom: 20px;
                    font-size: 0.9rem;
                    font-style: italic;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.98); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </>
    );
}
