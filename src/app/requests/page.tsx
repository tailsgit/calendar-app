
"use client";

import { useEffect, useState } from 'react';
import RequestCard from '@/components/requests/RequestCard';
import toast from 'react-hot-toast';

export default function RequestsPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const res = await fetch('/api/user/requests');
                if (res.ok) {
                    const data = await res.json();
                    setRequests(data.requests);
                }
            } catch (error) {
                console.error('Failed to fetch requests', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
    }, []);

    const handleRespond = async (id: string, type: string, action: 'accept' | 'decline') => {
        try {
            const res = await fetch('/api/user/requests/respond', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, type, action })
            });

            if (res.ok) {
                // Remove from list
                setRequests(prev => prev.filter(r => r.id !== id));
                toast.success('Response sent');
            } else {
                toast.error('Failed to process response');
            }
        } catch (error) {
            console.error('Error responding', error);
            toast.error('Error processing response');
        }
    };

    return (
        <div className="requests-page">
            <header className="page-header">
                <h1>Inbox</h1>
                <p className="subtitle">Manage your meeting invitations</p>
            </header>

            {loading ? (
                <div className="loading">Loading requests...</div>
            ) : requests.length === 0 ? (
                <div className="empty-state">
                    <div className="icon">🎉</div>
                    <h2>All caught up!</h2>
                    <p>You have no pending meeting requests.</p>
                </div>
            ) : (
                <div className="requests-grid">
                    {requests.map(request => (
                        <RequestCard
                            key={`${request.type}-${request.id}`}
                            request={request}
                            onRespond={handleRespond}
                        />
                    ))}
                </div>
            )}

            <style jsx>{`
                .requests-page {
                    padding: 40px;
                    max-width: 1000px;
                    margin: 0 auto;
                }

                .page-header {
                    margin-bottom: 40px;
                }

                h1 {
                    font-size: 2rem;
                    margin-bottom: 8px;
                    color: var(--color-text-main);
                }

                .subtitle {
                    color: var(--color-text-secondary);
                }

                .loading {
                    text-align: center;
                    padding: 40px;
                    color: var(--color-text-secondary);
                }

                .empty-state {
                    text-align: center;
                    padding: 60px;
                    background: white;
                    border-radius: var(--radius-lg);
                    border: 1px dashed var(--color-border);
                }

                .empty-state .icon { font-size: 3rem; margin-bottom: 16px; }
                .empty-state h2 { margin-bottom: 8px; color: var(--color-text-main); }
                .empty-state p { color: var(--color-text-secondary); }

                .requests-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                    gap: 24px;
                }
            `}</style>
        </div>
    );
}
