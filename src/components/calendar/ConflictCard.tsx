
"use client";

import { AlertTriangle } from 'lucide-react';

interface ConflictCardProps {
    eventCount: number;
    startTime: Date;
    endTime: Date;
    onClick?: () => void;
}

export default function ConflictCard({ eventCount, startTime, endTime, onClick }: ConflictCardProps) {
    // Calculate position same as EventCard
    const startHour = startTime.getHours();
    const startMin = startTime.getMinutes();
    const durationMin = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

    const top = (startHour * 60) + startMin;
    const height = durationMin;

    return (
        <div
            className="conflict-card"
            style={{
                top: `${top}px`,
                height: `${height}px`,
            }}
            onClick={(e) => {
                e.stopPropagation();
                onClick?.();
            }}
            title="Click to resolve conflict"
        >
            <div className="flex items-center space-x-1 font-bold mb-1">
                <AlertTriangle size={14} />
                <span>Collision Detected</span>
            </div>
            <div className="text-xs opacity-90">
                {eventCount} overlapping events
            </div>

            <style jsx>{`
                .conflict-card {
                    position: absolute;
                    left: 4px;
                    right: 4px;
                    border-radius: var(--radius-sm);
                    padding: 4px 8px;
                    font-size: 0.75rem;
                    color: #7f1d1d; /* Red-900 */
                    background: #fecaca; /* Red-200 */
                    border: 2px solid #ef4444; /* Red-500 */
                    border-left: 4px solid #b91c1c; /* Red-700 */
                    overflow: hidden;
                    cursor: pointer;
                    transition: transform 0.1s;
                    z-index: 10; /* Highest priority */
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }

                .conflict-card:hover {
                    transform: scale(1.02);
                    z-index: 20;
                    background: #fee2e2;
                }
            `}</style>
        </div>
    );
}
