"use client";

import { useState, useEffect, useRef } from 'react';

interface User {
    id: string;
    name: string;
    image: string | null;
    title: string | null;
    department: string | null;
    status: string;
}

interface MultiUserSearchProps {
    selectedUsers: User[];
    onAddUser: (user: User) => void;
    onRemoveUser: (userId: string) => void;
}

export default function MultiUserSearch({ selectedUsers, onAddUser, onRemoveUser }: MultiUserSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<User[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const isMaxed = selectedUsers.length >= 4;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const searchUsers = async () => {
            if (!query.trim()) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
                if (res.ok) {
                    const data = await res.json();
                    // Filter out already selected users
                    const availableUsers = data.users.filter((u: User) =>
                        !selectedUsers.some(selected => selected.id === u.id)
                    );
                    setResults(availableUsers);
                }
            } catch (error) {
                console.error('Search failed:', error);
            }
            setLoading(false);
        };

        const debounce = setTimeout(searchUsers, 300);
        return () => clearTimeout(debounce);
    }, [query, selectedUsers]);

    return (
        <div className="multi-user-search" ref={wrapperRef}>
            <div className={`search-container ${isMaxed ? 'maxed' : ''}`}>
                {selectedUsers.map(user => (
                    <div key={user.id} className="user-pill">
                        <div className="pill-avatar">
                            {user.image ? (
                                <img src={user.image} alt="" />
                            ) : (
                                <div className="pill-initial">{user.name.charAt(0)}</div>
                            )}
                        </div>
                        <span className="pill-name">{user.name.split(' ')[0]}</span>
                        <button
                            className="pill-remove"
                            onClick={() => onRemoveUser(user.id)}
                        >
                            ×
                        </button>
                    </div>
                ))}

                {!isMaxed ? (
                    <div className="input-wrapper">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setIsOpen(true);
                            }}
                            onFocus={() => setIsOpen(true)}
                            placeholder={selectedUsers.length === 0 ? "Search for coworkers..." : "Add another person..."}
                            className="search-input"
                        />
                    </div>
                ) : (
                    <div className="max-indicator">
                        <span className="lock-icon">🔒</span>
                        <span>Max: 4/4</span>
                    </div>
                )}
            </div>

            {isOpen && results.length > 0 && !isMaxed && (
                <div className="search-results">
                    {results.map(user => (
                        <div
                            key={user.id}
                            className="result-item"
                            onClick={() => {
                                onAddUser(user);
                                setQuery('');
                                setIsOpen(false);
                            }}
                        >
                            <div className="result-avatar">
                                {user.image ? (
                                    <img src={user.image} alt="" />
                                ) : (
                                    <div className="result-initial">{user.name.charAt(0)}</div>
                                )}
                            </div>
                            <div className="result-info">
                                <div className="result-name">{user.name}</div>
                                <div className="result-meta">
                                    {user.title && <span>{user.title}</span>}
                                    {user.department && <span> • {user.department}</span>}
                                </div>
                            </div>
                            <div className={`result-status status-${user.status}`}>
                                {user.status}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style jsx>{`
                .multi-user-search {
                    position: relative;
                    width: 100%;
                    max-width: 800px;
                    margin: 0 auto;
                }

                .search-container {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 12px;
                    background: var(--color-bg-main);
                    border: 1px solid var(--color-border);
                    border-radius: 24px;
                    min-height: 48px;
                    transition: all 0.2s;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }

                .search-container:focus-within {
                    border-color: var(--color-accent);
                    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.1);
                }

                .search-container.maxed {
                    background: var(--color-bg-secondary);
                    cursor: not-allowed;
                }

                .user-pill {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 8px 4px 4px;
                    background: #EBF5FF;
                    border: 1px solid #B3D7FF;
                    border-radius: 20px;
                    font-size: 0.9rem;
                    color: var(--color-accent);
                }

                .pill-avatar {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    overflow: hidden;
                    background: var(--color-accent);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 0.8rem;
                }

                .pill-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .pill-remove {
                    width: 16px;
                    height: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    border: none;
                    background: transparent;
                    color: var(--color-accent);
                    cursor: pointer;
                    font-size: 1.1rem;
                    line-height: 1;
                    padding: 0;
                }

                .pill-remove:hover {
                    background: rgba(0,0,0,0.1);
                    color: var(--color-error);
                }

                .input-wrapper {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    min-width: 200px;
                }

                .search-icon {
                    color: var(--color-text-light);
                }

                .search-input {
                    flex: 1;
                    border: none;
                    outline: none;
                    font-size: 1rem;
                    background: transparent;
                    color: var(--color-text-main);
                }

                .max-indicator {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--color-text-secondary);
                    font-size: 0.9rem;
                    padding: 0 8px;
                }

                .search-results {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    margin-top: 8px;
                    background: var(--color-bg-main);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-lg);
                    z-index: 50;
                    max-height: 300px;
                    overflow-y: auto;
                }

                .result-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .result-item:hover {
                    background: var(--color-bg-secondary);
                }

                .result-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: var(--color-accent);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                }

                .result-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .result-info {
                    flex: 1;
                }

                .result-name {
                    font-weight: 500;
                    color: var(--color-text-main);
                }

                .result-meta {
                    font-size: 0.8rem;
                    color: var(--color-text-secondary);
                }

                .result-status {
                    font-size: 0.75rem;
                    padding: 2px 8px;
                    border-radius: 12px;
                    text-transform: capitalize;
                }

                .status-available { background: #DCFCE7; color: #166534; }
                .status-busy { background: #FEE2E2; color: #991B1B; }
                .status-away { background: #FEF3C7; color: #92400E; }
            `}</style>
        </div>
    );
}
