"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';

export default function JoinGroupPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session, status } = useSession();
    const [group, setGroup] = useState<{ name: string; description: string | null; leader: { name: string | null }; _count: { members: number } } | null>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const code = params.code as string;

    useEffect(() => {
        fetchGroupInfo();
    }, [code]);

    const fetchGroupInfo = async () => {
        try {
            const res = await fetch(`/api/groups/join/${code}`);
            if (res.ok) {
                const data = await res.json();
                setGroup(data.group);
            } else {
                setError('Invalid or expired invite link');
            }
        } catch {
            setError('Failed to load group info');
        }
        setLoading(false);
    };

    const handleJoin = async () => {
        if (status !== 'authenticated') {
            signIn('google', { callbackUrl: `/join/${code}` });
            return;
        }

        setJoining(true);
        setError('');

        try {
            const res = await fetch(`/api/groups/join/${code}`, { method: 'POST' });
            const data = await res.json();

            if (res.ok) {
                setSuccess(data.message || 'Join request sent!');
                setTimeout(() => router.push('/team'), 2000);
            } else {
                setError(data.error || 'Failed to join group');
            }
        } catch {
            setError('Something went wrong');
        }
        setJoining(false);
    };

    if (loading) {
        return (
            <div className="join-page">
                <div className="join-card loading">Loading...</div>
            </div>
        );
    }

    return (
        <div className="join-page">
            <div className="join-card">
                {error && !group ? (
                    <>
                        <div className="error-icon">❌</div>
                        <h1>Invalid Link</h1>
                        <p>{error}</p>
                        <button onClick={() => router.push('/')}>Go Home</button>
                    </>
                ) : group ? (
                    <>
                        <div className="group-icon">👥</div>
                        <h1>Join {group.name}</h1>
                        {group.description && <p className="description">{group.description}</p>}
                        <div className="meta">
                            <span>👑 {group.leader.name || 'Leader'}</span>
                            <span>•</span>
                            <span>{group._count.members} members</span>
                        </div>

                        {success ? (
                            <div className="success-message">
                                <span>✅</span> {success}
                            </div>
                        ) : (
                            <>
                                {error && <div className="error-message">{error}</div>}
                                <button
                                    className="join-btn"
                                    onClick={handleJoin}
                                    disabled={joining}
                                >
                                    {status !== 'authenticated'
                                        ? 'Sign in to Join'
                                        : joining
                                            ? 'Requesting...'
                                            : 'Request to Join'}
                                </button>
                                <p className="note">
                                    The group leader will need to approve your request
                                </p>
                            </>
                        )}
                    </>
                ) : null}
            </div>

            <style jsx>{`
        .join-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: var(--spacing-lg);
        }

        .join-card {
          background: var(--color-bg-main);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          width: 100%;
          max-width: 400px;
          text-align: center;
          box-shadow: var(--shadow-lg);
        }

        .join-card.loading {
          color: var(--color-text-secondary);
        }

        .group-icon, .error-icon {
          font-size: 4rem;
          margin-bottom: var(--spacing-md);
        }

        h1 {
          font-size: 1.5rem;
          margin-bottom: var(--spacing-sm);
        }

        .description {
          color: var(--color-text-secondary);
          margin-bottom: var(--spacing-md);
        }

        .meta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          color: var(--color-text-secondary);
          font-size: 0.9rem;
          margin-bottom: var(--spacing-lg);
        }

        .join-btn {
          width: 100%;
          padding: 0.75rem;
          background: var(--color-accent);
          color: white;
          border-radius: var(--radius-md);
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }

        .join-btn:hover:not(:disabled) {
          background: var(--color-accent-hover);
        }

        .join-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .note {
          margin-top: var(--spacing-md);
          font-size: 0.8rem;
          color: var(--color-text-light);
        }

        .success-message {
          padding: var(--spacing-md);
          background: rgba(16, 185, 129, 0.1);
          color: var(--color-success);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
        }

        .error-message {
          padding: var(--spacing-sm);
          color: var(--color-error);
          font-size: 0.9rem;
          margin-bottom: var(--spacing-md);
        }

        button {
          cursor: pointer;
        }
      `}</style>
        </div>
    );
}
