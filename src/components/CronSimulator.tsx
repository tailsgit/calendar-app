"use client";

import { useEffect } from "react";

/**
 * Simulates an external CRON job by polling the reminder API endpoint.
 * This ensures notifications are generated even in local development without Vercel Cron.
 */
export default function CronSimulator() {
    useEffect(() => {
        // Run immediately on mount
        const runCron = async () => {
            try {
                // Don't log success to avoid console spam, only errors
                await fetch('/api/cron/reminders');
            } catch (e) {
                console.error("Cron Simulator failed:", e);
            }
        };

        runCron();

        // Run every 60 seconds
        const interval = setInterval(runCron, 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    return null; // Render nothing
}
