"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { usePathname } from 'next/navigation';

export default function AppShell({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const pathname = usePathname();

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    return (
        <div className="app-shell">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <TopBar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setIsSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            <main className="main-content">
                {children}
            </main>

            <style jsx global>{`
        /* Reuse Global Styles here or assume generic classes */
        .sidebar-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 45; /* Between TopBar (40) and Sidebar (50) */
          animation: fadeIn 0.2s ease-out;
        }

        @media (min-width: 1025px) {
          .sidebar-overlay {
            display: none;
          }
        }
      `}</style>
        </div>
    );
}
