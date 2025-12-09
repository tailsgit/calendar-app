"use client";

import { useState, useEffect } from 'react';

interface NewMeetingFormProps {
    onClose: () => void;
    onSuccess: (event?: any) => void;
    initialDate?: string;
    initialTime?: string;
    initialEndTime?: string;
    initialTitle?: string;
    initialDescription?: string;
    initialLocation?: string;
    initialAttendees?: { id: string, name: string, email: string, image: string | null }[];
}

export default function NewMeetingForm({ onClose, onSuccess, initialDate, initialTime, initialEndTime, initialTitle, initialDescription, initialLocation, initialAttendees }: NewMeetingFormProps) {
    const [loading, setLoading] = useState(false);
    const [checkingAvailability, setCheckingAvailability] = useState(true);
    const [hasAvailability, setHasAvailability] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        title: initialTitle || '',
        date: initialDate || new Date().toISOString().split('T')[0],
        startTime: initialTime || '09:00',
        endTime: initialEndTime || (initialTime ?
            `${String(Number(initialTime.split(':')[0]) + 1).padStart(2, '0')}:00` :
            '10:00'),
        description: initialDescription || '',
        location: initialLocation || 'video',
        attendees: initialAttendees || []
    });

    useEffect(() => {
        const checkUserAvailability = async () => {
            try {
                const res = await fetch('/api/user/availability');
                if (res.ok) {
                    const data = await res.json();
                    // Check if there is at least one enabled day
                    // If data is empty (new user), they have no availability set
                    const hasActiveDays = data && data.length > 0 && data.some((slot: any) => slot.isEnabled);
                    setHasAvailability(hasActiveDays);
                } else {
                    // If API fails, default to allowing usage to not block existing users due to error
                    // But for this specific feature request, strict mode might be better. 
                    // Let's assume strict: if we can't confirm availability, we prompt to check settings.
                    // However, safe fallback is usually better. Let's start with safe.
                    // actually, prompt implies new accounts.
                    setHasAvailability(false);
                }
            } catch (err) {
                console.error('Failed to check availability', err);
                setHasAvailability(false); // Err on side of caution? Or allow?
                // Given the prompt "new account... should not be able", I'll set false to force setup.
            } finally {
                setCheckingAvailability(false);
            }
        };

        checkUserAvailability();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Combine date and time
            const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
            const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

            const response = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title,
                    description: formData.description,
                    startTime: startDateTime.toISOString(),
                    endTime: endDateTime.toISOString(),
                    locationType: formData.location.toUpperCase(),
                    attendees: formData.attendees.map(a => a.id) // Assuming API expects IDs
                }),
            });


            const createdEvent = await response.json();
            onSuccess(createdEvent);
            onClose();
        } catch (error: any) {
            console.error(error);
            setError(error.message || 'Error creating meeting');
        } finally {
            setLoading(false);
        }
    };

    if (checkingAvailability) {
        return <div className="p-8 text-center text-gray-500">Checking account status...</div>;
    }

    if (!hasAvailability) {
        return (
            <div className="no-availability-state">
                <div className="icon">📅</div>
                <h3>Availability Not Set</h3>
                <p>You need to set your weekly availability before you can schedule meetings.</p>

                <div className="actions">
                    <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                    <a href="/settings" className="btn btn-primary">Go to Settings</a>
                </div>

                <style jsx>{`
                    .no-availability-state {
                        text-align: center;
                        padding: 20px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 16px;
                    }
                    .icon { font-size: 3rem; margin-bottom: 8px; }
                    h3 { font-size: 1.25rem; font-weight: 600; color: var(--color-text-main); margin: 0; }
                    p { color: var(--color-text-secondary); max-width: 300px; line-height: 1.5; margin: 0; }
                    .actions { display: flex; gap: 12px; margin-top: 24px; width: 100%; justify-content: center; }
                    .btn { padding: 10px 20px; border-radius: 8px; font-weight: 500; text-decoration: none; cursor: pointer; border: none; font-size: 0.95rem; }
                    .btn-primary { background: var(--color-primary, #4F46E5); color: white; }
                    .btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-main); }
                `}</style>
            </div>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="meeting-form"
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
        >
            <div className="form-group">
                <label>Meeting Title</label>
                <input
                    type="text"
                    required
                    placeholder="e.g. Team Sync"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label>Date</label>
                    <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label>Start Time</label>
                    <input
                        type="time"
                        required
                        value={formData.startTime}
                        onChange={e => {
                            setFormData({ ...formData, startTime: e.target.value });
                            setError(null);
                        }}
                        className={error ? 'error-input' : ''}
                    />
                </div>
                <div className="form-group">
                    <label>End Time</label>
                    <input
                        type="time"
                        required
                        value={formData.endTime}
                        onChange={e => {
                            setFormData({ ...formData, endTime: e.target.value });
                            setError(null);
                        }}
                        className={error ? 'error-input' : ''}
                    />
                </div>
            </div>
            {error && (
                <div className="error-message">
                    ⚠️ {error}
                </div>
            )}

            <div className="form-group">
                <label>Location</label>
                <select
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                >
                    <option value="video">Video Call (Zoom/Meet)</option>
                    <option value="phone">Phone Call</option>
                    <option value="in_person">In Person</option>
                </select>
            </div>

            <div className="form-group">
                <label>Description</label>
                <textarea
                    rows={3}
                    placeholder="Add agenda or notes..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
            </div>

            <div className="form-actions">
                <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Meeting'}
                </button>
            </div>

            <style jsx>{`
        .meeting-form {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .form-row {
          display: flex;
          gap: var(--spacing-md);
        }

        .form-row .form-group {
          flex: 1;
        }

        label {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--color-text-secondary);
        }

        input, select, textarea {
          padding: 0.5rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-family: inherit;
          font-size: 1rem;
        }

        input:focus, select:focus, textarea:focus {
          outline: none;
          border-color: var(--color-accent);
          box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.1);
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--spacing-md);
          margin-top: var(--spacing-md);
          padding-top: var(--spacing-md);
          border-top: 1px solid var(--color-border);
        }

        .error-input {
            border-color: var(--color-error) !important;
            background-color: #FEF2F2;
        }

        .error-message {
            color: var(--color-error);
            font-size: 0.9rem;
            margin-top: -10px;
            margin-bottom: var(--spacing-md);
            padding: 0.5rem;
            background-color: #FEF2F2;
            border-radius: var(--radius-md);
            border: 1px solid #FECACA;
        }
      `}</style>
        </form>
    );
}
