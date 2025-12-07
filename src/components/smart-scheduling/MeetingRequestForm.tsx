
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { TimeSlot } from '@/lib/smart-scheduling';

interface User {
    id: string;
    name: string;
    image: string | null;
}

interface MeetingRequestFormProps {
    selectedSlot: TimeSlot | null;
    durationMinutes: number;
    users: User[];
    onClose: () => void;
    onSubmit: () => void;
    isOpen: boolean;
}

export default function MeetingRequestForm({ selectedSlot, durationMinutes, users, onClose, onSubmit, isOpen }: MeetingRequestFormProps) {
    const [title, setTitle] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset when slot changes
    useEffect(() => {
        if (selectedSlot) {
            setTitle('');
            setNotes('');
            setSuccess(false);
            setError(null);
            setIsSubmitting(false);
        }
    }, [selectedSlot]);

    const handleSend = async () => {
        if (!title.trim() || !selectedSlot) return;

        setIsSubmitting(true);
        setError(null);
        try {
            const res = await fetch('/api/meetings/smart-create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    startTime: selectedSlot.start,
                    endTime: selectedSlot.end,
                    participants: users,
                    notes,
                    locationType: 'VIDEO' // Default
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create meeting');
            }

            setSuccess(true);
            setTimeout(() => {
                onSubmit();
            }, 2000); // Close after success message
        } catch (err: any) {
            console.error('Error sending invites:', err);
            setError(err.message || 'Failed to send invites. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !selectedSlot) return null;

    return (
        <div className="meeting-form-overlay">
            <div className="meeting-form-container">
                {success ? (
                    <div className="success-view">
                        <div className="success-icon">✓</div>
                        <h3>Invites Sent!</h3>
                        <p>{title}</p>
                        <p>{format(selectedSlot.start, 'EEEE, MMM d @ h:mm a')}</p>
                        <p className="sub-text">All {users.length} attendees notified.</p>
                    </div>
                ) : (
                    <>
                        <div className="form-header">
                            <h3>Quick Schedule Meeting</h3>
                            <button className="close-btn" onClick={onClose}>×</button>
                        </div>

                        <div className="form-body">
                            <div className="attendees-list">
                                <span className="label">With:</span>
                                <div className="avatars">
                                    {users.map(u => (
                                        <div key={u.id} className="mini-user" title={u.name}>
                                            <div className="initials">{u.name.charAt(0)}</div>
                                            <span className="name">{u.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="selected-time-summary">
                                <div className="check-badge">✓ SELECTED TIME</div>
                                <div className="time-details">
                                    {format(selectedSlot.start, 'EEEE, MMMM d, yyyy')}
                                    <br />
                                    {format(selectedSlot.start, 'h:mm a')} - {format(selectedSlot.end, 'h:mm a')} ({durationMinutes} min)
                                </div>
                                <div className="optimal-badge">🌟 Optimal time - All {users.length} people available</div>
                            </div>

                            <div className="form-group">
                                <label>Meeting Title *</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Project Sync"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="form-group">
                                <label>Location</label>
                                <div className="radio-group">
                                    <label><input type="radio" name="loc" defaultChecked /> Video Call (Zoom)</label>
                                    <label><input type="radio" name="loc" /> Phone</label>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Notes (Optional)</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="error-message">
                                ⚠️ {error}
                            </div>
                        )}

                        <div className="form-footer">
                            <button className="cancel-btn" onClick={onClose}>Cancel</button>
                            <button
                                className="submit-btn"
                                onClick={handleSend}
                                disabled={!title.trim() || isSubmitting}
                            >
                                {isSubmitting ? 'Sending Invites...' : `Send Invites to All ${users.length}`}
                            </button>
                        </div>
                    </>
                )}
            </div>

            <style jsx>{`
                .meeting-form-overlay {
                    position: fixed;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    left: 0;
                    background: rgba(0,0,0,0.3);
                    z-index: 1000;
                    display: flex;
                    justify-content: flex-end;
                    opacity: 1;
                    animation: fadeIn 0.2s;
                }

                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

                .meeting-form-container {
                    width: 450px;
                    background: white;
                    height: 100%;
                    box-shadow: -5px 0 25px rgba(0,0,0,0.15);
                    display: flex;
                    flex-direction: column;
                    animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

                .form-header {
                    padding: 24px;
                    border-bottom: 1px solid #eee;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #f8f9fa;
                }
                
                .form-header h3 { margin: 0; color: #333; }
                .close-btn { font-size: 24px; border: none; background: none; cursor: pointer; color: #999; }

                .form-body {
                    padding: 24px;
                    overflow-y: auto;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .attendees-list {
                    margin-bottom: 10px;
                }

                .label { font-size: 0.85rem; color: #666; display: block; margin-bottom: 8px; }

                .avatars { display: flex; flex-wrap: wrap; gap: 8px; }
                
                .mini-user {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: #f0f0f0;
                    padding: 4px 8px;
                    border-radius: 20px;
                    font-size: 0.8rem;
                }

                .initials {
                    width: 20px;
                    height: 20px;
                    background: #6A5ACD;
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.7rem;
                    font-weight: bold;
                }

                .selected-time-summary {
                    background: #E8F5E9;
                    border: 1px solid #C8E6C9;
                    border-radius: 8px;
                    padding: 16px;
                }

                .check-badge {
                    color: #2E7D32;
                    font-weight: 700;
                    font-size: 0.8rem;
                    letter-spacing: 0.5px;
                    margin-bottom: 8px;
                }

                .time-details {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #1B5E20;
                    line-height: 1.4;
                    margin-bottom: 12px;
                }

                .optimal-badge {
                    display: inline-block;
                    background: #4CAF50;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }

                .form-group label {
                    display: block;
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #444;
                    margin-bottom: 8px;
                }

                .form-group input[type="text"], .form-group textarea {
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 1rem;
                }

                .form-group input:focus, .form-group textarea:focus {
                    outline: none;
                    border-color: #6A5ACD;
                    box-shadow: 0 0 0 2px rgba(106, 90, 205, 0.1);
                }

                .radio-group { display: flex; gap: 16px; }
                .radio-group label { font-weight: 400; display: flex; align-items: center; gap: 6px; }

                .form-footer {
                    padding: 20px 24px;
                    border-top: 1px solid #eee;
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }

                .error-message {
                    margin: 0 24px 10px;
                    padding: 10px;
                    background: #FEF2F2;
                    border: 1px solid #FCA5A5;
                    color: #991B1B;
                    border-radius: 6px;
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .cancel-btn {
                    padding: 10px 20px;
                    border: 1px solid #ddd;
                    background: white;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    color: #666;
                }

                .submit-btn {
                    padding: 10px 24px;
                    background: #6A5ACD;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .submit-btn:hover:not(:disabled) { background: #5a4bbf; }
                .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

                .success-view {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 40px;
                    color: #333;
                }

                .success-icon {
                    width: 60px;
                    height: 60px;
                    background: #4CAF50;
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 30px;
                    margin-bottom: 24px;
                    animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }

                @keyframes popIn { from { transform: scale(0); } to { transform: scale(1); } }

                .success-view h3 { font-size: 1.5rem; margin-bottom: 8px; }
                .success-view p { font-size: 1.1rem; margin: 4px 0; color: #555; }
                .sub-text { font-size: 0.9rem !important; color: #999 !important; margin-top: 16px !important; }
            `}</style>
        </div>
    );
}
