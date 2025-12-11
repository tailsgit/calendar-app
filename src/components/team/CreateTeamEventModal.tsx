"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Users } from 'lucide-react';
import Modal from '../ui/Modal';

interface User {
    id: string;
    name: string;
    image: string | null;
}

interface CreateTeamEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (title: string, startTime: Date, endTime: Date, locationType: string, description: string) => Promise<void>;
    initialDate: Date | null;
    participants: User[];
}

export default function CreateTeamEventModal({ isOpen, onClose, onConfirm, initialDate, participants }: CreateTeamEventModalProps) {
    const [title, setTitle] = useState('');

    // Split date/time state
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    const [locationType, setLocationType] = useState('VIDEO');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            let start = initialDate ? new Date(initialDate) : new Date();

            // If fallback (no initialDate), round to next hour
            if (!initialDate) {
                start.setMinutes(0, 0, 0);
                if (start < new Date()) {
                    start.setHours(start.getHours() + 1);
                }
            }

            setDate(format(start, "yyyy-MM-dd"));
            setStartTime(format(start, "HH:mm"));

            const end = new Date(start.getTime() + 60 * 60 * 1000);
            setEndTime(format(end, "HH:mm"));

            setTitle('');
            setDescription('');
            setLocationType('VIDEO');
        }
    }, [isOpen, initialDate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Combine date + time
            const startDateTime = new Date(`${date}T${startTime}`);
            const endDateTime = new Date(`${date}T${endTime}`);

            // Handle cross-day end time if needed
            if (endDateTime < startDateTime) {
                endDateTime.setDate(endDateTime.getDate() + 1);
            }

            await onConfirm(title || 'Team Meeting', startDateTime, endDateTime, locationType, description);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Schedule New Meeting"
            width="600px"
        >
            <form onSubmit={handleSubmit} className="modal-body">
                <div className="form-group">
                    <label>Meeting Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g. Team Sync"
                        autoFocus
                    />
                </div>

                <div className="form-row-three">
                    <div className="form-group">
                        <label>Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Start Time</label>
                        <input
                            type="time"
                            value={startTime}
                            onChange={e => setStartTime(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>End Time</label>
                        <input
                            type="time"
                            value={endTime}
                            onChange={e => setEndTime(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Participants ({participants.length})</label>
                    {participants.length > 0 ? (
                        <div className="participants-grid">
                            {participants.map(user => (
                                <div key={user.id} className="participant-chip">
                                    {user.image ? (
                                        <img src={user.image} alt={user.name} className="participant-avatar" />
                                    ) : (
                                        <div className="participant-initial">{user.name.charAt(0)}</div>
                                    )}
                                    <span className="participant-name">{user.name.split(' ')[0]}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500 italic p-2 bg-gray-50 rounded">
                            Just you
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label>Location</label>
                    <select
                        value={locationType}
                        onChange={e => setLocationType(e.target.value)}
                    >
                        <option value="VIDEO">Video Call (Zoom/Meet)</option>
                        <option value="PHONE">Phone Call</option>
                        <option value="IN_PERSON">In Person</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Description</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Add agenda or notes..."
                        rows={3}
                    />
                </div>

                <div className="modal-footer">
                    <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Scheduling...' : 'Create Meeting'}
                    </button>
                </div>
            </form>

            <style jsx>{`
                .modal-body { padding: 0; }
                .form-group { margin-bottom: var(--spacing-md); }
                .form-group label { display: block; margin-bottom: 6px; font-size: 0.85rem; color: var(--color-text-secondary); font-weight: 600; }
                
                .form-group input,
                .form-group select,
                .form-group textarea {
                    width: 100%; padding: 10px 12px;
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    font-size: 0.95rem;
                    font-family: inherit;
                    background: var(--color-bg-main);
                    color: var(--color-text-main);
                }
                
                .form-group input:focus,
                .form-group select:focus,
                .form-group textarea:focus {
                    outline: none;
                    border-color: var(--color-accent);
                    box-shadow: 0 0 0 2px var(--color-accent-transparent);
                }

                .form-row-three { 
                    display: grid; 
                    grid-template-columns: 1.2fr 1fr 1fr; /* Date wider than time */
                    gap: var(--spacing-md); 
                }

                .participants-grid {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    padding: 8px;
                    background: var(--color-bg-secondary);
                    border-radius: var(--radius-md);
                    max-height: 100px;
                    overflow-y: auto;
                }

                .participant-chip {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: var(--color-bg-main);
                    border: 1px solid var(--color-border);
                    padding: 4px 8px;
                    border-radius: 999px;
                    font-size: 0.85rem;
                }

                .participant-avatar, .participant-initial {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    object-fit: cover;
                }
                .participant-initial {
                    background: var(--color-accent);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.7rem;
                    font-weight: 600;
                }

                .modal-footer {
                    display: flex; justify-content: flex-end; gap: 10px;
                    margin-top: 24px;
                    padding-top: 16px;
                    border-top: 1px solid var(--color-border);
                }
                .btn-primary {
                    background: var(--color-accent); color: white;
                    border: none; padding: 8px 20px; border-radius: 6px;
                    font-weight: 500; cursor: pointer;
                    font-size: 0.9rem;
                }
                .btn-secondary {
                    background: transparent; color: var(--color-text-secondary);
                    border: 1px solid var(--color-border); padding: 8px 16px; border-radius: 6px;
                    font-weight: 500; cursor: pointer;
                    font-size: 0.9rem;
                }
                .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
            `}</style>
        </Modal>
    );
}
