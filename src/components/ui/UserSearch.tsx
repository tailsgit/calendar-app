"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  status: string;
  department: string | null;
  title: string | null;
  groups?: { id: string; name: string }[];
}

export default function UserSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchUsers = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.users || []);
        }
      } catch (error) {
        console.error('Search error:', error);
      }
      setLoading(false);
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#10B981';
      case 'busy': return '#EF4444';
      case 'away': return '#F59E0B';
      default: return '#9CA3AF';
    }
  };

  const handleSelectUser = (user: User) => {
    // Navigate to user profile page
    router.push(`/user/${user.id}`);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className="user-search" ref={dropdownRef}>
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search team members..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => query.length > 1 && setIsOpen(true)}
        />
        {loading && <span className="loading-spinner">⏳</span>}
      </div>

      {isOpen && query.length > 1 && (
        <div className="results-dropdown">
          {results.length === 0 ? (
            <div className="no-results">
              {loading ? 'Searching...' : 'No team members found'}
            </div>
          ) : (
            results.map(user => (
              <div
                key={user.id}
                className="user-result"
                onClick={() => handleSelectUser(user)}
              >
                <div className="user-avatar">
                  {user.image ? (
                    <img src={user.image} alt={user.name || ''} />
                  ) : (
                    <span>{user.name?.slice(0, 2).toUpperCase() || 'U'}</span>
                  )}
                  <span
                    className="status-dot"
                    style={{ backgroundColor: getStatusColor(user.status) }}
                  />
                </div>
                <div className="user-info">
                  <div className="user-name">{user.name || 'Unknown'}</div>
                  <div className="user-meta">
                    {user.title && <span>{user.title}</span>}
                    {user.title && user.department && <span> • </span>}
                    {user.department && <span>{user.department}</span>}
                  </div>
                </div>
                <button className="schedule-btn">📅</button>
              </div>
            ))
          )}
        </div>
      )}

      <style jsx>{`
        .user-search {
          position: relative;
          width: 100%;
          max-width: 400px;
        }

        .search-input-wrapper {
          display: flex;
          align-items: center;
          background: var(--color-bg-secondary);
          padding: 0.5rem 1rem;
          border-radius: var(--radius-full);
          gap: var(--spacing-sm);
        }

        .search-input-wrapper input {
          border: none;
          background: none;
          outline: none;
          width: 100%;
          font-size: 0.9rem;
          color: var(--color-text-main);
        }

        .search-icon {
          flex-shrink: 0;
        }

        .loading-spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .results-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: var(--color-bg-main);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          max-height: 400px;
          overflow-y: auto;
          z-index: 100;
        }

        .no-results {
          padding: var(--spacing-lg);
          text-align: center;
          color: var(--color-text-secondary);
        }

        .user-result {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          cursor: pointer;
          transition: background-color var(--transition-fast);
          border-bottom: 1px solid var(--color-border);
        }

        .user-result:last-child {
          border-bottom: none;
        }

        .user-result:hover {
          background: var(--color-bg-secondary);
        }

        .user-avatar {
          position: relative;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--color-accent);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.9rem;
          overflow: hidden;
        }

        .user-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .status-dot {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid var(--color-bg-main);
        }

        .user-info {
          flex: 1;
          min-width: 0;
        }

        .user-name {
          font-weight: 600;
          color: var(--color-text-main);
        }

        .user-meta {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .schedule-btn {
          padding: 0.5rem;
          background: var(--color-accent);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: transform var(--transition-fast);
        }

        .schedule-btn:hover {
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}
