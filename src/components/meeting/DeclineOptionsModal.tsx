"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';

interface DeclineOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (option: 'not-this-week' | 'reschedule', data: any) => Promise<void>;
}

export default function DeclineOptionsModal({ isOpen, onClose, onConfirm }: DeclineOptionsModalProps) {
    if (!isOpen) return null;

    const [option, setOption] = useState<'not-this-week' | 'reschedule'>('not-this-week');
    const [reason, setReason] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [rescheduleNote, setRescheduleNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            if (option === 'not-this-week') {
                if (!reason.trim()) {
                    toast.error('Please provide a reason');
                    setIsSubmitting(false);
                    return;
                }
                await onConfirm('not-this-week', { reason });
            } else {
                if (!startTime || !endTime) {
                    toast.error('Please select a time frame');
                    setIsSubmitting(false);
                    return;
                }
                await onConfirm('reschedule', { startTime, endTime, note: rescheduleNote });
            }
            toast.success('Response submitted');
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Failed to submit response');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="close-btn" onClick={onClose}>×</button>
                <h2>Decline Meeting</h2>
                <div className="options">
                    <label className={`option-card ${option === 'not-this-week' ? 'selected' : ''}`}>
                        <input
                            type="radio"
                            name="decline-option"
                            value="not-this-week"
                            checked={option === 'not-this-week'}
                            onChange={() => setOption('not-this-week')}
                        />
                        <div className="option-info">
                            <strong>Not this week</strong>
                            <p>Decline this week's request.</p>
                        </div>
                    </label>

                    <label className={`option-card ${option === 'reschedule' ? 'selected' : ''}`}>
                        <input
                            type="radio"
                            name="decline-option"
                            value="reschedule"
                            checked={option === 'reschedule'}
                            onChange={() => setOption('reschedule')}
                        />
                        <div className="option-info">
                            <strong>Reschedule</strong>
                            <p>Propose a new time frame.</p>
                        </div>
                    </label>
                </div>

                <div className="input-section">
                    {option === 'not-this-week' ? (
                        <div className="reason-input">
                            <label>Reason (required)</label>
                            <textarea
                                placeholder="I'm at capacity with the release. Early next week could work."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                maxLength={240}
                            />
                        </div>
                    ) : (
                        <div className="reschedule-input">
                            <p>You can browse the team calendar to find a better time for everyone.</p>
                            <label>Note (optional)</label>
                            <input
                                type="text"
                                placeholder="Any specific preferences?"
                                value={rescheduleNote}
                                onChange={(e) => setRescheduleNote(e.target.value)}
                                style={{ marginBottom: '16px' }}
                            />
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="cancel-btn" onClick={onClose}>Cancel</button>
                    {option === 'reschedule' ? (
                        <button className="submit-btn" onClick={() => onConfirm('reschedule', { note: rescheduleNote })}>
                            Find Time on Calendar
                        </button>
                    ) : (
                        <button className="submit-btn" onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting...' : 'Submit Response'}
                        </button>
                    )}
                </div>
            </div>

            <style jsx>{`
                .modal-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
                    display: flex; justify-content: center; align-items: center; z-index: 1100;
                }
                .modal-content {
                    background: white; padding: 24px; border-radius: 12px;
                    width: 450px; max-width: 90vw; position: relative;
                }
                .close-btn {
                    position: absolute; right: 16px; top: 16px; background: none; border: none; font-size: 20px; cursor: pointer; color: #666;
                }
                h2 { margin-top: 0; margin-bottom: 20px; font-size: 1.25rem; }
                
                .options { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
                .option-card {
                    display: flex; align-items: flex-start; gap: 12px; padding: 12px;
                    border: 1px solid #ddd; border-radius: 8px; cursor: pointer; transition: all 0.2s;
                }
                .option-card.selected { border-color: #4f46e5; background: #eef2ff; }
                .option-card:hover { border-color: #999; }
                .option-info strong { display: block; margin-bottom: 4px; color: #1f2937; }
                .option-info p { margin: 0; font-size: 0.85rem; color: #4b5563; }

                .input-section { margin-bottom: 24px; }
                label { display: block; font-weight: 500; font-size: 0.9rem; margin-bottom: 8px; color: #374151; }
                textarea {
                    width: 100%; border: 1px solid #ddd; border-radius: 6px; padding: 10px;
                    min-height: 80px; font-family: inherit;
                }
                .time-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
                input[type="datetime-local"], input[type="text"] {
                    padding: 8px; border: 1px solid #ddd; border-radius: 6px; flex: 1;
                }

                .modal-footer { display: flex; justify-content: flex-end; gap: 10px; }
                .cancel-btn { padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer; }
                .submit-btn { padding: 8px 16px; background: #dc2626; color: white; border: none; border-radius: 6px; font-weight: 500; cursor: pointer; }
                .submit-btn:disabled { opacity: 0.5; }
            `}</style>
        </div>
    );
}
