"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import NotificationBell from "@/components/ui/NotificationBell";
import UserSearch from "@/components/ui/UserSearch";

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { data: session, status } = useSession();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="topbar" role="banner">
      <div
        className="mobile-menu-btn"
        aria-label="Toggle menu"
        onClick={onMenuClick}
      >
        <span>☰</span>
      </div>

      <UserSearch />

      <div className="topbar-actions">
        <NotificationBell />

        {status === "loading" ? (
          <div className="avatar-skeleton"></div>
        ) : session?.user ? (
          <div className="user-menu" ref={menuRef}>
            <div
              className="avatar"
              aria-label="User profile"
              onClick={() => setShowMenu(!showMenu)}
            >
              {session.user.image ? (
                <img src={session.user.image} alt={session.user.name || ''} />
              ) : (
                session.user.name?.slice(0, 2).toUpperCase() || 'U'
              )}
            </div>

            {showMenu && (
              <div className="dropdown-menu">
                <div className="menu-header">
                  <strong>{session.user.name}</strong>
                  <span>{session.user.email}</span>
                </div>
                <div className="menu-divider"></div>
                <a href="/settings" className="menu-item">⚙️ Settings</a>
                <button
                  className="menu-item sign-out"
                  onClick={() => signOut()}
                >
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            className="signin-btn"
            onClick={() => signIn("google")}
          >
            Sign In
          </button>
        )}
      </div>

      <style jsx>{`
        .topbar {
          height: var(--topbar-height, 64px);
          background-color: var(--color-bg-secondary);
          border-bottom: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--spacing-xl);
          position: fixed;
          top: 0;
          left: calc(var(--sidebar-width) + 2 * var(--spacing-md)); /* Account for floating sidebar margin + gap */
          right: 0;
          z-index: 40;
          transition: left var(--transition-normal, 0.25s ease);
        }

        .mobile-menu-btn {
          display: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: var(--spacing-sm);
        }

        .search-bar {
          display: flex;
          align-items: center;
          background-color: var(--color-bg-main);
          padding: 0.5rem 1rem;
          border-radius: var(--radius-full);
          width: 400px;
          gap: var(--spacing-sm);
          transition: width var(--transition-normal);
        }

        .search-bar input {
          border: none;
          background: none;
          outline: none;
          width: 100%;
          font-size: 0.9rem;
          color: var(--color-text-main);
        }

        .topbar-actions {
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
        }

        .avatar-skeleton {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--color-bg-secondary);
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .avatar {
          width: 40px;
          height: 40px;
          background-color: var(--color-accent);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 0.9rem;
          cursor: pointer;
          transition: transform var(--transition-fast);
          overflow: hidden;
        }

        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar:hover {
          transform: scale(1.05);
        }

        .signin-btn {
          padding: 0.5rem 1rem;
          background: var(--color-accent);
          color: white;
          border-radius: var(--radius-md);
          font-weight: 500;
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }

        .signin-btn:hover {
          background: var(--color-accent-hover);
        }

        .user-menu {
          position: relative;
        }

        .dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 220px;
          background: var(--color-bg-main);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          z-index: 100;
          animation: fadeIn 0.15s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .menu-header {
          padding: var(--spacing-md);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .menu-header strong {
          font-size: 0.95rem;
        }

        .menu-header span {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
        }

        .menu-divider {
          height: 1px;
          background: var(--color-border);
        }

        .menu-item {
          display: block;
          width: 100%;
          padding: var(--spacing-sm) var(--spacing-md);
          text-align: left;
          font-size: 0.9rem;
          color: var(--color-text-main);
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: none;
          transition: background-color var(--transition-fast);
        }

        .menu-item:hover {
          background: var(--color-bg-secondary);
        }

        .menu-item.sign-out {
          color: var(--color-error);
        }

        @media (max-width: 1024px) {
          .topbar {
            left: 0;
          }

          .mobile-menu-btn {
            display: block;
          }
        }

        @media (max-width: 768px) {
          .topbar {
            padding: 0 var(--spacing-md);
            height: 56px;
          }

          .search-bar {
            width: 100%;
            max-width: 300px;
          }
        }

        @media (max-width: 480px) {
          .search-bar {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}


