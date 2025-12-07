"use client";

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        // Check for saved preference or system preference
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            setIsDark(true);
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);

        if (newTheme) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        }
    };

    return (
        <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            <span className="toggle-track">
                <span className={`toggle-thumb ${isDark ? 'dark' : 'light'}`}>
                    {isDark ? '🌙' : '☀️'}
                </span>
            </span>

            <style jsx>{`
        .theme-toggle {
          display: flex;
          align-items: center;
          cursor: pointer;
          padding: var(--spacing-xs);
        }

        .toggle-track {
          width: 56px;
          height: 28px;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-full);
          position: relative;
          transition: background-color var(--transition-normal);
        }

        .toggle-thumb {
          position: absolute;
          top: 2px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          transition: left var(--transition-normal), background-color var(--transition-normal);
        }

        .toggle-thumb.light {
          left: 2px;
          background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
        }

        .toggle-thumb.dark {
          left: 30px;
          background: linear-gradient(135deg, #4A5568 0%, #2D3748 100%);
        }
      `}</style>
        </button>
    );
}
