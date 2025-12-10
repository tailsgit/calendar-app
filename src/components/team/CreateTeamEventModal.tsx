"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { X, Users } from 'lucide-react';

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
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (isOpen && initialDate) {
            // Default 1 hour duration
            setDate(format(initialDate, "yyyy-MM-dd"));
            setStartTime(format(initialDate, "HH:mm"));

            const end = new Date(initialDate.getTime() + 60 * 60 * 1000);
            setEndTime(format(end, "HH:mm"));

            setTitle('');
            setDescription('');
            setLocationType('VIDEO');
        } else if (isOpen) {
            // Fallback if no initialDate
            const now = new Date();
            now.setMinutes(0, 0, 0); // Round to hour

            setDate(format(now, "yyyy-MM-dd"));
            setStartTime(format(now, "HH:mm"));

            const end = new Date(now.getTime() + 60 * 60 * 1000);
            setEndTime(format(end, "HH:mm"));

            setTitle('');
            setDescription('');
            setLocationType('VIDEO');
        }
    }, [isOpen, initialDate]);

    if (!isOpen || !mounted) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Combine date + time
            const startDateTime = new Date(`${date}T${startTime}`);
            const endDateTime = new Date(`${date}T${endTime}`);

            // Handle cross-day end time if needed (simple version assumes same day for now, or user picks logic)
            // But if end time < start time, maybe it's next day? 
            // For simplicity, let's assume same day unless end < start, then +1 day
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

    const modalContent = (
        <div
            className="modal-overlay"
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 999999,
                animation: 'fadeIn 0.2s ease'
            }}
        >
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">

                    <h2>Schedule New Meeting</h2>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

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
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }

                    .modal-content {
                        background: var(--color-bg-main);
                        border-radius: var(--radius-lg);
                        width: 100%; max-width: 600px; /* Slightly wider for 3 columns */
                        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                        overflow: hidden;
                        animation: slideUp 0.2s ease;
                    }

                    @keyframes slideUp {
                        from { transform: translateY(20px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }

                    .modal-header {
                        padding: var(--spacing-lg);
                        border-bottom: 1px solid var(--color-border);
                        display: flex; justify-content: space-between; align-items: center;
                    }
                    .modal-header h2 { font-size: 1.1rem; font-weight: 600; margin: 0; }
                    .close-btn { background: none; border: none; cursor: pointer; color: var(--color-text-secondary); padding: 4px; border-radius: 4px; }
                    .close-btn:hover { background-color: var(--color-bg-secondary); }
                    
                    .modal-body { padding: var(--spacing-lg); }
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

                    .modal-footer {
                        display: flex; justify-content: flex-end; gap: 10px;
                        margin-top: 24px;
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
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
