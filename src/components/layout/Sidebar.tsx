"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <aside className="sidebar" role="navigation" aria-label="Main navigation">
      <div className="sidebar-header">
        <div className="logo">
          <Calendar className="logo-icon" size={24} />
          <span className="logo-text">slotavo</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <Link href="/" className={`nav-item nav-home ${isActive('/') ? 'active' : ''}`} aria-current={isActive('/') ? 'page' : undefined}>
          <span className="text">Home</span>
        </Link>
        <Link href="/requests" className={`nav-item nav-inbox ${isActive('/requests') ? 'active' : ''}`} aria-current={isActive('/requests') ? 'page' : undefined}>
          <span className="text">Inbox</span>
        </Link>
        <Link href="/team" className={`nav-item nav-team ${isActive('/team') ? 'active' : ''}`} aria-current={isActive('/team') ? 'page' : undefined}>
          <span className="text">Team Calendar</span>
        </Link>
        <Link href="/groups" className={`nav-item nav-groups ${isActive('/groups') ? 'active' : ''}`} aria-current={isActive('/groups') ? 'page' : undefined}>
          <span className="text">Groups</span>
        </Link>
      </nav>

      <div className="sidebar-footer">
        <Link href="/settings" className={`nav-item nav-settings ${isActive('/settings') ? 'active' : ''}`} aria-current={isActive('/settings') ? 'page' : undefined}>
          <span className="text">Settings</span>
        </Link>
      </div>

      <style jsx>{`
        .sidebar {
          width: var(--sidebar-width, 280px);
        height: calc(100vh - 2 * var(--spacing-md)); /* Floating height */
        background-color: var(--color-bg-main); /* Uses Variable (White/DarkGray) */
        border: 1px solid var(--color-border); /* Uses Variable */
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-md);
        display: flex;
        flex-direction: column;
        position: fixed;
        left: var(--spacing-md);
        top: var(--spacing-md);
        z-index: 50;
        transition: transform var(--transition-normal, 0.25s ease);
        }

        .sidebar-header {
          padding: var(--spacing-xl) var(--spacing-lg);
        border-bottom: 1px solid var(--color-border); 
        }

        .logo {
          display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        font-weight: 800; /* Bolder */
        font-size: 1.5rem;
        color: var(--color-accent);
        letter-spacing: -0.5px;
        }

        .sidebar-nav {
          padding: var(--spacing-xl) var(--spacing-lg); /* Increased padding */
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-lg); /* Increased gap between items */
        }

        .nav-item {
          display: flex;
        align-items: center;
        gap: var(--spacing-md);
        padding: var(--spacing-md) var(--spacing-lg); /* Adjusted padding for text-only */
        border-radius: var(--radius-md);
        color: var(--color-text-secondary);
        transition: all var(--transition-fast, 0.15s ease);
        font-weight: 600; /* Slightly bolder for text-only */
        font-size: 1.05rem; /* Slightly larger */
        }

        .nav-item:hover {
          background - color: var(--color-bg-secondary);
        color: var(--color-text-main);
        padding-left: var(--spacing-xl); /* Subtle indent on hover */
        }

        .nav-item.active {
          background - color: var(--color-bg-secondary);
        color: var(--color-accent);
        }

        .sidebar-footer {
          padding: var(--spacing-lg);
        border-top: 1px solid var(--color-border);
        }

        @media (max-width: 1024px) {
          .sidebar {
          transform: translateX(-100%);
          }

        .sidebar.open {
          transform: translateX(0);
          }
        }
      `}</style>
    </aside>
  );
}
