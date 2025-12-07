"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Timer, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { RRule } from 'rrule';

interface Event {
    id: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    locationType?: string;
    color: string;
    recurrence?: string;
    participants?: any[];
    ownerId?: string;
    status?: string;
}

interface EventModalProps {
    event: Event | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (event: Event) => Promise<void>;
    onDelete: (eventId: string) => Promise<void>;
    mode: 'view' | 'edit' | 'create';
    currentUserId?: string;
    onRespond?: (id: string, action: 'accept' | 'decline') => Promise<void>;
}

export default function EventModal({ event, isOpen, onClose, onSave, onDelete, mode, currentUserId, onRespond }: EventModalProps) {
    const [formData, setFormData] = useState<Partial<Event>>({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        locationType: 'VIDEO',
        recurrence: 'NONE',
    });
    const [isEditing, setIsEditing] = useState(mode === 'edit' || mode === 'create');
    const [loading, setLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Custom Recurrence State
    const [recurrenceType, setRecurrenceType] = useState('NONE');
    const [customFreq, setCustomFreq] = useState('WEEKLY');
    const [customInterval, setCustomInterval] = useState(1);
    const [customDays, setCustomDays] = useState<string[]>([]); // MO, TU...
    const [customEnds, setCustomEnds] = useState<string>(''); // Date string

    const WEEKDAYS = [
        { key: 'MO', label: 'M' },
        { key: 'TU', label: 'T' },
        { key: 'WE', label: 'W' },
        { key: 'TH', label: 'T' },
        { key: 'FR', label: 'F' },
        { key: 'SA', label: 'S' },
        { key: 'SU', label: 'S' },
    ];

    useEffect(() => {
        if (event) {
            setFormData({
                ...event,
                startTime: format(new Date(event.startTime), "yyyy-MM-dd'T'HH:mm"),
                endTime: format(new Date(event.endTime), "yyyy-MM-dd'T'HH:mm"),
            });

            // Parse recurrence
            if (!event.recurrence || event.recurrence === 'NONE') {
                setRecurrenceType('NONE');
            } else if (['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'].includes(event.recurrence)) {
                setRecurrenceType(event.recurrence);
            } else {
                setRecurrenceType('CUSTOM');
                try {
                    const rule = RRule.fromString(event.recurrence);
                    // Map RRule integer frequency to string
                    const freqMap: Record<number, string> = { [RRule.DAILY]: 'DAILY', [RRule.WEEKLY]: 'WEEKLY', [RRule.MONTHLY]: 'MONTHLY', [RRule.YEARLY]: 'YEARLY' };
                    setCustomFreq(freqMap[rule.options.freq] || 'WEEKLY');
                    setCustomInterval(rule.options.interval || 1);
                    // Create basic byday array if present
                    if (rule.options.byweekday) {
                        // RRule stores byweekday as integers (0=MO) or objects
                        const dayMap = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
                        // @ts-ignore
                        setCustomDays(rule.options.byweekday.map(d => dayMap[d.weekday]));
                    }
                    if (rule.options.until) {
                        setCustomEnds(format(rule.options.until, "yyyy-MM-dd"));
                    }
                } catch (e) {
                    console.error("Failed to parse RRule", e);
                }
            }
        }
        setIsEditing(mode === 'edit' || mode === 'create');
        setError(null);
    }, [event, mode]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            let finalRecurrence = recurrenceType;
            if (recurrenceType === 'CUSTOM') {
                // Construct RRule
                const freqMap: Record<string, any> = { 'DAILY': RRule.DAILY, 'WEEKLY': RRule.WEEKLY, 'MONTHLY': RRule.MONTHLY, 'YEARLY': RRule.YEARLY };
                const dayMap: Record<string, any> = { 'MO': RRule.MO, 'TU': RRule.TU, 'WE': RRule.WE, 'TH': RRule.TH, 'FR': RRule.FR, 'SA': RRule.SA, 'SU': RRule.SU };

                const options: any = {
                    freq: freqMap[customFreq],
                    interval: customInterval,
                };
                if (customFreq === 'WEEKLY' && customDays.length > 0) {
                    options.byweekday = customDays.map(d => dayMap[d]);
                }
                if (customEnds) {
                    options.until = new Date(customEnds);
                }

                // Important: RRule string should NOT include DTSTART if we want it to float with the event start time?
                // Actually, standard RRule strings usually include DTSTART or depend on the event's start.
                // We'll generate the string without DTSTART, as the API/DB assumes recurrence applies to the event object which has startTime.
                // However, RRule.toString() usually output "RRULE:...".

                const rule = new RRule(options);
                finalRecurrence = rule.toString().replace(/^RRULE:/, '');
            }

            // Strip ID suffix (timestamp) if editing a recurring instance
            const originalId = event?.id?.split('_')[0] || '';

            await onSave({
                ...formData,
                id: originalId,
                startTime: new Date(formData.startTime!).toISOString(),
                endTime: new Date(formData.endTime!).toISOString(),
                color: event?.color || '#4A90E2',
                recurrence: finalRecurrence,
            } as Event);
            onClose();
        } catch (error: any) {
            console.error('Failed to save event', error);
            setError(error.message || 'Failed to save event');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!event?.id) return;
        const originalId = event.id.split('_')[0];
        setLoading(true);
        try {
            await onDelete(originalId);
            onClose();
        } catch (error) {
            console.error('Failed to delete event', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{mode === 'create' ? 'New Event' : isEditing ? 'Edit Event' : 'Event Details'}</h2>
                    <button className="close-btn" onClick={onClose} aria-label="Close">×</button>
                </div>

                {isEditing ? (
                    <form
                        onSubmit={handleSubmit}
                        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                    >
                        <div className="form-group">
                            <label>Title</label>
                            <input
                                type="text"
                                value={formData.title || ''}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                required
                                placeholder="Event title"
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Start</label>
                                <input
                                    type="datetime-local"
                                    value={formData.startTime || ''}
                                    onChange={e => {
                                        setFormData({ ...formData, startTime: e.target.value });
                                        setError(null);
                                    }}
                                    required
                                    className={error ? 'error-input' : ''}
                                />
                            </div>
                            <div className="form-group">
                                <label>End</label>
                                <input
                                    type="datetime-local"
                                    value={formData.endTime || ''}
                                    onChange={e => {
                                        setFormData({ ...formData, endTime: e.target.value });
                                        setError(null);
                                    }}
                                    required
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
                            <label>Location Type</label>
                            <select
                                value={formData.locationType || 'VIDEO'}
                                onChange={e => setFormData({ ...formData, locationType: e.target.value })}
                            >
                                <option value="VIDEO">📹 Video Call</option>
                                <option value="PHONE">📞 Phone Call</option>
                                <option value="IN_PERSON">📍 In Person</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Recurrence</label>
                            <select
                                value={recurrenceType}
                                onChange={e => {
                                    setRecurrenceType(e.target.value);
                                    if (e.target.value !== 'CUSTOM') {
                                        setFormData({ ...formData, recurrence: e.target.value });
                                    }
                                }}
                            >
                                <option value="NONE">Does not repeat</option>
                                <option value="DAILY">Daily</option>
                                <option value="WEEKLY">Weekly</option>
                                <option value="BIWEEKLY">Every 2 weeks</option>
                                <option value="MONTHLY">Monthly</option>
                                <option value="CUSTOM">Custom...</option>
                            </select>
                        </div>

                        {recurrenceType === 'CUSTOM' && (
                            <div className="custom-recurrence bg-gray-50 p-4 rounded-md border border-gray-200 mb-4 text-sm">
                                <div className="flex gap-2 items-center mb-3">
                                    <span>Repeat every</span>
                                    <input
                                        type="number"
                                        min="1"
                                        value={customInterval}
                                        onChange={e => setCustomInterval(parseInt(e.target.value) || 1)}
                                        className="w-16 p-1 border rounded"
                                    />
                                    <select
                                        value={customFreq}
                                        onChange={e => setCustomFreq(e.target.value)}
                                        className="p-1 border rounded"
                                    >
                                        <option value="DAILY">Day(s)</option>
                                        <option value="WEEKLY">Week(s)</option>
                                        <option value="MONTHLY">Month(s)</option>
                                        <option value="YEARLY">Year(s)</option>
                                    </select>
                                </div>

                                {customFreq === 'WEEKLY' && (
                                    <div className="mb-3">
                                        <div className="mb-1 text-xs text-gray-500">Repeats on:</div>
                                        <div className="flex gap-1">
                                            {WEEKDAYS.map(day => (
                                                <button
                                                    key={day.key}
                                                    type="button"
                                                    className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${customDays.includes(day.key)
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                                                        }`}
                                                    onClick={() => {
                                                        if (customDays.includes(day.key)) {
                                                            setCustomDays(customDays.filter(d => d !== day.key));
                                                        } else {
                                                            setCustomDays([...customDays, day.key]);
                                                        }
                                                    }}
                                                >
                                                    {day.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <span>Ends on:</span>
                                    <input
                                        type="date"
                                        value={customEnds}
                                        onChange={e => setCustomEnds(e.target.value)}
                                        className="p-1 border rounded"
                                    />
                                    <button
                                        type="button"
                                        className="text-xs text-gray-500 hover:text-gray-700 underline"
                                        onClick={() => setCustomEnds('')}
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Add notes or details..."
                                rows={3}
                            />
                        </div>

                        <div className="modal-actions">
                            {mode !== 'create' && (
                                <div className="delete-wrapper">
                                    {showDeleteConfirm ? (
                                        <div className="delete-confirm">
                                            <span>Are you sure?</span>
                                            <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete} disabled={loading}>
                                                Yes, Delete
                                            </button>
                                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowDeleteConfirm(false)}>
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button type="button" className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)} disabled={loading}>
                                            Delete
                                        </button>
                                    )}
                                </div>
                            )}
                            <div className="right-actions">
                                <button type="button" className="btn btn-secondary" onClick={onClose}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </form>
                ) : (
                    <div className="event-details">
                        <h3>{event?.title}</h3>
                        <div className="detail-row">
                            <span className="label">📅 When:</span>
                            <span>{format(new Date(event!.startTime), 'EEEE, MMMM d, yyyy')}</span>
                        </div>
                        <div className="detail-row">
                            <span className="label">🕐 Time:</span>
                            <span>{format(new Date(event!.startTime), 'h:mm a')} - {format(new Date(event!.endTime), 'h:mm a')}</span>
                        </div>
                        {event?.locationType && (
                            <div className="detail-row">
                                <span className="label">📍 Location:</span>
                                <span>
                                    {event.locationType === 'VIDEO' ? 'Video Call' :
                                        event.locationType === 'PHONE' ? 'Phone Call' : 'In Person'}
                                </span>
                            </div>
                        )}
                        {event?.description && (
                            <div className="detail-row">
                                <span className="label">📝 Notes:</span>
                                <span>{event.description}</span>
                            </div>
                        )}
                        {event?.participants && event.participants.length > 0 && (
                            <div className="running-late-section mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <Timer className="w-4 h-4 text-gray-500" />
                                    Running Late?
                                </h4>
                                <div className="running-late-buttons">
                                    {[5, 10, 15].map(mins => (
                                        <button
                                            key={mins}
                                            onClick={async () => {
                                                if (!event) return;
                                                const promise = fetch(`/api/events/${event.id}/notify`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        type: 'running_late',
                                                        delayMinutes: mins
                                                    })
                                                });

                                                await toast.promise(promise, {
                                                    loading: 'Sending...',
                                                    success: 'Sent!',
                                                    error: 'Failed.'
                                                });
                                            }}
                                            className="running-late-btn"
                                        >
                                            {mins} min
                                        </button>
                                    ))}
                                </div>

                                {/* Participants List */}
                                {event?.participants && event.participants.length > 0 && (
                                    <div className="participants-section mt-6">
                                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                                            Participants ({event.participants.length})
                                        </h4>
                                        <div className="participants-list">
                                            {event.participants.map((p: any) => {
                                                const status = p.status || 'PENDING';
                                                // Get first name only
                                                const displayName = (p.name || p.email).split(' ')[0];

                                                return (
                                                    <div key={p.id} className="participant-row">
                                                        <span className="participant-name">
                                                            {displayName}
                                                        </span>
                                                        <span className={`participant-status ${status.toLowerCase()}`}>
                                                            {status === 'ACCEPTED' ? 'Accepted' :
                                                                status === 'DECLINED' ? 'Declined' :
                                                                    'Pending'}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="modal-actions">
                            {/* Action Buttons based on Ownership */}
                            {currentUserId && event?.ownerId && event.ownerId !== currentUserId ? (
                                // Invitee View
                                <div className="flex w-full gap-2 justify-end">
                                    {onRespond && (
                                        <>
                                            <button
                                                className="btn btn-secondary bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
                                                onClick={() => onRespond(event.id, 'decline')}
                                            >
                                                Decline
                                            </button>
                                            <button
                                                className="btn btn-primary bg-green-600 hover:bg-green-700"
                                                onClick={() => onRespond(event.id, 'accept')}
                                            >
                                                Accept
                                            </button>
                                        </>
                                    )}
                                </div>
                            ) : (
                                // Owner View
                                <>
                                    <div className="delete-wrapper">
                                        {showDeleteConfirm ? (
                                            <div className="delete-confirm">
                                                <span>Are you sure?</span>
                                                <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={loading}>
                                                    Yes, Delete
                                                </button>
                                                <button className="btn btn-secondary btn-sm" onClick={() => setShowDeleteConfirm(false)}>
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)} disabled={loading}>
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                    <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                                        Edit
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
                <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
            animation: fadeIn 0.2s ease;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .modal-content {
            background: var(--color-bg-main);
            border-radius: var(--radius-lg);
            width: 100%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
            animation: slideUp 0.2s ease;
          }

          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--spacing-lg);
            border-bottom: 1px solid var(--color-border);
          }

          .modal-header h2 {
            font-size: 1.25rem;
          }

          .close-btn {
            font-size: 1.5rem;
            color: var(--color-text-secondary);
            padding: var(--spacing-xs);
          }

          form, .event-details {
            padding: var(--spacing-lg);
          }

          .form-group {
            margin-bottom: var(--spacing-md);
          }

          .form-group label {
            display: block;
            margin-bottom: var(--spacing-xs);
            font-weight: 500;
            font-size: 0.9rem;
            color: var(--color-text-secondary);
          }

          .form-group input,
          .form-group select,
          .form-group textarea {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            font-family: inherit;
            font-size: 1rem;
          }

          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: var(--spacing-md);
          }

          .event-details h3 {
            font-size: 1.25rem;
            margin-bottom: var(--spacing-lg);
          }

          .detail-row {
            display: flex;
            gap: var(--spacing-sm);
            margin-bottom: var(--spacing-md);
          }

          .detail-row .label {
            color: var(--color-text-secondary);
            min-width: 100px;
          }

          .modal-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: var(--spacing-md);
            margin-top: var(--spacing-lg);
            padding-top: var(--spacing-lg);
            border-top: 1px solid var(--color-border);
          }

          .right-actions {
            display: flex;
            gap: var(--spacing-sm);
          }

          .delete-wrapper {
            flex: 1;
          }

          .delete-confirm {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
          }
          
          .delete-confirm span {
            font-size: 0.9rem;
            font-weight: 500;
            color: var(--color-error);
          }

          .btn-sm {
            padding: 0.25rem 0.5rem;
            font-size: 0.85rem;
          }

          .btn-danger {
            background-color: var(--color-error);
            color: white;
          }

          .btn-danger:hover {
            background-color: #dc2626;
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

          /* Running Late Section */
          .running-late-section {
            padding: var(--spacing-md);
            background-color: #F9FAFB;
            border-radius: var(--radius-md);
            border: 1px solid var(--color-border);
            margin-top: var(--spacing-lg);
          }

          .running-late-buttons {
            display: flex;
            gap: 12px;
            margin-top: 8px;
          }

          .running-late-btn {
            flex: 1;
            padding: 8px 12px;
            background: transparent;
            border: 1px solid #D1D5DB;
            border-radius: 6px;
            font-size: 0.8rem;
            font-weight: 500;
            color: #4B5563;
            cursor: pointer;
            transition: all 0.2s;
          }

          .running-late-btn:hover {
            border-color: #3B82F6;
            color: #2563EB;
            background-color: #eff6ff;
          }

          /* Participants Section */
          .participants-section {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid var(--color-border);
          }
          
          .participants-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .participant-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #f3f4f6;
            font-size: 0.9rem;
          }
          
          .participant-row:last-child {
            border-bottom: none;
          }

          .participant-name {
            font-weight: 500;
            color: #374151;
            margin-right: 16px;
          }

          .participant-status {
            font-size: 0.75rem;
            padding: 2px 8px;
            border-radius: 9999px;
            white-space: nowrap;
          }

          .participant-status.accepted {
            background-color: #ECFDF5;
            color: #047857;
          }

          .participant-status.declined {
            background-color: #FEF2F2;
            color: #B91C1C;
            text-decoration: line-through;
          }

          .participant-status.pending {
            background-color: #F3F4F6;
            color: #6B7280;
          }

          .custom-recurrence input,
          .custom-recurrence select {
              border-color: #d1d5db;
          }
        `}</style>
            </div>
        </div>
    );
}
