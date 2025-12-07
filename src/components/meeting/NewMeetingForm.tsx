"use client";

import { useState } from 'react';

interface NewMeetingFormProps {
    onClose: () => void;
    onSuccess: () => void;
    initialDate?: string;
    initialTime?: string;
    initialTitle?: string;
}

export default function NewMeetingForm({ onClose, onSuccess, initialDate, initialTime, initialTitle }: NewMeetingFormProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        title: initialTitle || '',
        date: initialDate || new Date().toISOString().split('T')[0],
        startTime: initialTime || '09:00',
        endTime: initialTime ?
            `${String(Number(initialTime.split(':')[0]) + 1).padStart(2, '0')}:00` :
            '10:00',
        description: '',
        location: 'video'
    });

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
                    locationType: formData.location.toUpperCase()
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create meeting');
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            setError(error.message || 'Error creating meeting');
        } finally {
            setLoading(false);
        }
    };

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
