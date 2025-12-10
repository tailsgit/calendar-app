"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X, Clock, Users } from 'lucide-react';

interface User {
    id: string;
    name: string;
    image: string | null;
}

interface CreateTeamEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (title: string, startTime: Date, endTime: Date) => Promise<void>;
    initialDate: Date | null;
    participants: User[];
}

export default function CreateTeamEventModal({ isOpen, onClose, onConfirm, initialDate, participants }: CreateTeamEventModalProps) {
    const [title, setTitle] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && initialDate) {
            // Default 1 hour duration
            setStartTime(format(initialDate, "yyyy-MM-dd'T'HH:mm"));
            const end = new Date(initialDate.getTime() + 60 * 60 * 1000);
            setEndTime(format(end, "yyyy-MM-dd'T'HH:mm"));
            setTitle('Team Sync');
        }
    }, [isOpen, initialDate]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onConfirm(title, new Date(startTime), new Date(endTime));
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Schedule Team Meeting</h2>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-group">
                        <label>Event Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                            placeholder="e.g. Sync"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Start</label>
                            <input
                                type="datetime-local"
                                value={startTime}
                                onChange={e => setStartTime(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>End</label>
                            <input
                                type="datetime-local"
                                value={endTime}
                                onChange={e => setEndTime(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="participants-preview">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Users size={16} />
                            Inviting {participants.length} People
                        </label>
                        <div className="participants-list">
                            {participants.map(user => (
                                <div key={user.id} className="participant-chip">
                                    <div className="avatar-xs">
                                        {user.image ? <img src={user.image} alt="" /> : user.name[0]}
                                    </div>
                                    <span>{user.name.split(' ')[0]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Scheduling...' : 'Schedule Meeting'}
                        </button>
                    </div>
                </form>

                <style jsx>{`
                    .modal-overlay {
                        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                        background: rgba(0,0,0,0.5);
                        display: flex; align-items: center; justify-content: center;
                        z-index: 100;
                    }
                    .modal-content {
                        background: var(--color-bg-main);
                        border-radius: 12px;
                        width: 100%; max-width: 450px;
                        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                        overflow: hidden;
                    }
                    .modal-header {
                        padding: 16px 20px;
                        border-bottom: 1px solid var(--color-border);
                        display: flex; justify-content: space-between; align-items: center;
                    }
                    .modal-header h2 { font-size: 1.1rem; font-weight: 600; margin: 0; }
                    .close-btn { background: none; border: none; cursor: pointer; color: var(--color-text-secondary); }
                    
                    .modal-body { padding: 20px; }
                    .form-group { margin-bottom: 16px; }
                    .form-group label { display: block; margin-bottom: 6px; font-size: 0.9rem; color: var(--color-text-secondary); font-weight: 500; }
                    .form-group input {
                        width: 100%; padding: 8px 12px;
                        border: 1px solid var(--color-border);
                        border-radius: 6px;
                        font-size: 0.95rem;
                    }
                    .form-row { display: flex; gap: 12px; }
                    .form-row .form-group { flex: 1; }

                    .participants-preview {
                        background: var(--color-bg-secondary);
                        padding: 12px;
                        border-radius: 8px;
                        margin-bottom: 20px;
                    }
                    .participants-list { display: flex; flex-wrap: wrap; gap: 8px; }
                    .participant-chip {
                        display: flex; align-items: center; gap: 6px;
                        background: var(--color-bg-main);
                        padding: 4px 8px 4px 4px;
                        border-radius: 20px;
                        border: 1px solid var(--color-border);
                        font-size: 0.85rem;
                    }
                    .avatar-xs {
                        width: 20px; height: 20px; border-radius: 50%;
                        background: var(--color-accent); color: white;
                        display: flex; align-items: center; justify-content: center;
                        font-size: 0.7rem; overflow: hidden;
                    }
                    .avatar-xs img { width: 100%; height: 100%; object-fit: cover; }

                    .modal-footer {
                        display: flex; justify-content: flex-end; gap: 10px;
                    }
                    .btn-primary {
                        background: var(--color-accent); color: white;
                        border: none; padding: 8px 16px; border-radius: 6px;
                        font-weight: 500; cursor: pointer;
                    }
                    .btn-secondary {
                        background: transparent; color: var(--color-text-secondary);
                        border: 1px solid var(--color-border); padding: 8px 16px; border-radius: 6px;
                        font-weight: 500; cursor: pointer;
                    }
                    .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
                `}</style>
            </div>
        </div>
    );
}
