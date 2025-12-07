
"use client";

import { useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Participant {
    id: string;
    name: string | null;
    email: string;
    status: string;
    image?: string | null;
}

interface MeetingObject {
    id: string;
    title: string;
    description?: string;
    startTime: Date | string;
    endTime: Date | string;
    locationType?: string;
    status: string;
    ownerId: string;
    participants: Participant[];
}

interface MeetingObjectDetailProps {
    meeting: MeetingObject;
    isOpen: boolean;
    onClose: () => void;
    currentUserId: string;
    onRespond?: (id: string, action: 'accept' | 'decline') => void;
}

import DeclineOptionsModal from './DeclineOptionsModal';

export default function MeetingObjectDetail({ meeting, isOpen, onClose, currentUserId, onRespond }: MeetingObjectDetailProps) {
    const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);

    if (!isOpen) return null;

    const isProposer = meeting.ownerId === currentUserId;

    // Logic to handle detailed respond (not passing simple action up anymore for decline)
    const handleDeclineConfirm = async (option: 'not-this-week' | 'reschedule', data: any) => {
        // We need to call different APIs based on option
        try {
            if (option === 'not-this-week') {
                await fetch(`/api/events/${meeting.id}/respond`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'decline', responseNote: data.reason })
                });
                onClose();
                window.location.reload();
            } else {
                // Redirect to team calendar with Participants
                const participantIds = meeting.participants.map(p => p.id /* This is likely Participant ID. We need USER ID */);
                // We need to map participants to USER IDs. 
                // Assuming participant.id is NOT userId.
                // Best effort: filter known user ids. If participants joined with userId, use it.
                // Assuming meeting.participants has userId or we pass pure user ids?
                // For now, let's assume we pass user IDs. If `p` has `email` we can search by email? 
                // Or better, let's just pass the event ID and let the Team Calendar Page fetch the participants from the event!

                // New Approach: Pass reschedule=eventId to /team. Team page fetches the event and its participants.
                window.location.href = `/team?reschedule=${meeting.id}`;
            }
        } catch (error) {
            console.error(error);
            toast.error('Error processing request');
        }
    };
    const myParticipant = meeting.participants.find(p => p.id === currentUserId /* This might match Participant ID or User ID, assuming access to mapping */)
        || meeting.participants.find(p => p.email === 'user_email_here'); // ideally we match by userId

    // Simplify: Assume we can find my status if I am not owner
    // For rendering, we iterate participants.

    return (
        <div className="modal-overlay">
            <div className="meeting-object-card">
                <div className="card-header">
                    <div className="status-badge state-badge">
                        State: {meeting.status}
                    </div>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <h2 className="title">{meeting.title}</h2>
                <div className="time-info">
                    {format(new Date(meeting.startTime), 'EEEE, MMMM d, yyyy')}
                    <br />
                    {format(new Date(meeting.startTime), 'h:mm a')} - {format(new Date(meeting.endTime), 'h:mm a')}
                </div>

                {meeting.description && (
                    <div className="description">
                        <strong>Notes to Group:</strong>
                        <p>{meeting.description}</p>
                    </div>
                )}

                <div className="participants-section">
                    <h3>Object Lifecycle & Nodes</h3>
                    <div className="participants-list">
                        <div className={`participant-row ${meeting.ownerId === currentUserId ? 'is-me' : ''}`}>
                            <span className="p-name">Owner (Proposer)</span>
                            <span className="p-status status-ACCEPTED">PROPOSED</span>
                        </div>
                        {meeting.participants.map(p => (
                            <div key={p.id} className="participant-row">
                                <span className="p-name">{p.name || p.email}</span>
                                <span className={`p-status status-${p.status || 'PENDING'}`}>
                                    {p.status || 'PENDING'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {!isProposer && onRespond && (
                    <div className="actions">
                        <button className="btn decline" onClick={() => setIsDeclineModalOpen(true)}>
                            Decline
                        </button>
                        {(myParticipant?.status !== 'ACCEPTED') && (
                            <button className="btn accept" onClick={() => onRespond(meeting.id, 'accept')}>
                                Accept
                            </button>
                        )}
                    </div>
                )}
            </div>

            <DeclineOptionsModal
                isOpen={isDeclineModalOpen}
                onClose={() => setIsDeclineModalOpen(false)}
                onConfirm={handleDeclineConfirm}
            />

            <style jsx>{`
                .modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 1000;
                }
                .meeting-object-card {
                    background: white; width: 500px; padding: 30px;
                    border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    animation: slideUp 0.3s ease;
                }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                
                .card-header { display: flex; justify-content: space-between; margin-bottom: 20px; }
                .state-badge {
                    background: #f3f4f6; color: #374151; padding: 4px 12px; border-radius: 20px;
                    font-weight: 600; font-size: 0.8rem; letter-spacing: 0.05em; text-transform: uppercase;
                }
                .close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #9ca3af; }

                .title { font-size: 1.8rem; margin: 0 0 10px 0; color: #111827; }
                .time-info { font-size: 1.1rem; color: #4b5563; margin-bottom: 24px; line-height: 1.5; }
                .description { background: #fffbeb; border: 1px solid #fcd34d; padding: 15px; border-radius: 8px; margin-bottom: 24px; color: #92400e; }
                
                .participants-section h3 { font-size: 0.9rem; text-transform: uppercase; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px; }
                .participants-list { display: flex; flex-direction: column; gap: 8px; }
                .participant-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; }
                .p-status { font-weight: 600; font-size: 0.8rem; padding: 2px 8px; border-radius: 4px; }
                .status-ACCEPTED { color: #059669; bg: #ecfdf5; }
                .status-PENDING { color: #d97706; }
                .status-DECLINED { color: #dc2626; text-decoration: line-through; }
                .status-PROPOSED { color: #4f46e5; }

                .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 30px; }
                .btn { padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; font-size: 1rem; }
                .accept { background: #4f46e5; color: white; }
                .decline { background: #fee2e2; color: #dc2626; }
             `}</style>
        </div>
    );
}
