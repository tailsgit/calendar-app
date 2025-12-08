
"use client";

import { useState } from 'react';
import { format } from 'date-fns';

interface Request {
    id: string;
    type: 'direct_request' | 'event_invite';
    title: string;
    requester: {
        name: string | null;
        image: string | null;
    };
    startTime: string;
    endTime: string;
    duration: number;
    locationType: string;
    message?: string;
    createdAt: string;
}

interface RequestCardProps {
    request: Request;
    onRespond: (id: string, type: string, action: 'accept' | 'decline') => Promise<void>;
}

export default function RequestCard({ request, onRespond }: RequestCardProps) {
    const [status, setStatus] = useState<'idle' | 'accepting' | 'declining'>('idle');

    const handleAction = async (action: 'accept' | 'decline') => {
        setStatus(action === 'accept' ? 'accepting' : 'declining');
        await onRespond(request.id, request.type, action);
        // Parent will likely remove this card, so status reset might not matter
    };

    return (
        <div className="request-card">
            <div className="card-header">
                <div className="requester-info">
                    <div className="avatar">
                        {request.requester.image ? (
                            <img src={request.requester.image} alt={request.requester.name || '?'} />
                        ) : (
                            <div className="initial">{(request.requester.name || '?').charAt(0)}</div>
                        )}
                    </div>
                    <div className="requester-text">
                        <span className="name">{request.requester.name || 'Unknown'}</span>
                        <span className="action-text">invited you to</span>
                    </div>
                </div>
                <div className="timestamp">
                    {format(new Date(request.createdAt), 'MMM d')}
                </div>
            </div>

            <div className="card-body">
                <h3 className="meeting-title">{request.title}</h3>
                <div className="meeting-time">
                    <span className="icon">🕒</span>
                    {format(new Date(request.startTime), 'EEEE, MMMM d')} • {format(new Date(request.startTime), 'h:mm a')} - {format(new Date(request.endTime), 'h:mm a')}
                </div>
                {request.message && <div className="message">"{request.message}"</div>}

                <div className="details-badges">
                    <span className="badge location">{request.locationType}</span>
                    <span className="badge duration">{request.duration} min</span>
                </div>
            </div>

            <div className="card-actions">
                <button
                    className="btn decline"
                    onClick={() => handleAction('decline')}
                    disabled={status !== 'idle'}
                >
                    {status === 'declining' ? 'Declining...' : 'Decline'}
                </button>
                <button
                    className="btn accept"
                    onClick={() => handleAction('accept')}
                    disabled={status !== 'idle'}
                >
                    {status === 'accepting' ? 'Accepting...' : 'Accept'}
                </button>
            </div>

            <style jsx>{`
                .request-card {
                    background: var(--color-bg-main);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg);
                    padding: 20px;
                    transition: all 0.2s;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
                }

                .request-card:hover {
                    box-shadow: 0 8px 16px rgba(0,0,0,0.05);
                    transform: translateY(-2px);
                }

                .card-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 16px;
                }

                .requester-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    overflow: hidden;
                    background: var(--color-bg-secondary);
                }
                
                .avatar img { width: 100%; height: 100%; object-fit: cover; }
                .initial { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: var(--color-text-secondary); }

                .requester-text {
                    display: flex;
                    flex-direction: column;
                }

                .name { font-weight: 600; color: var(--color-text-main); }
                .action-text { font-size: 0.85rem; color: var(--color-text-secondary); }

                .timestamp { font-size: 0.8rem; color: var(--color-text-light); }

                .meeting-title {
                    font-size: 1.2rem;
                    margin: 0 0 8px 0;
                    color: var(--color-text-main);
                }

                .meeting-time {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--color-text-secondary);
                    font-size: 0.95rem;
                    margin-bottom: 12px;
                }

                .message {
                    font-style: italic;
                    color: var(--color-text-secondary);
                    background: var(--color-bg-secondary);
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 0.9rem;
                    margin-bottom: 16px;
                }

                .details-badges {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 20px;
                }

                .badge {
                    font-size: 0.75rem;
                    padding: 2px 8px;
                    border-radius: 12px;
                    background: var(--color-bg-secondary);
                    color: var(--color-text-secondary);
                    text-transform: capitalize;
                }

                .card-actions {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }

                .btn {
                    padding: 10px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.2s;
                    border: none;
                }

                .decline {
                    background: #FFF1F2;
                    color: #BE123C;
                }
                .decline:hover:not(:disabled) { background: #FFE4E6; }

                .accept {
                    background: var(--color-accent);
                    color: white;
                }
                .accept:hover:not(:disabled) { opacity: 0.9; }

                .btn:disabled { opacity: 0.5; cursor: default; }
            `}</style>
        </div>
    );
}
