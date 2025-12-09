
import React from 'react';
import { format } from 'date-fns';
import { TimeSlot } from '@/lib/smart-scheduling';

interface SuggestionCardProps {
    slot: TimeSlot;
    userCount: number;
    durationMinutes: number;
    onSelect: (slot: TimeSlot) => void;
    isSelected?: boolean;
    disabled?: boolean;
}

export default function SuggestionCard({ slot, userCount, durationMinutes, onSelect, isSelected, disabled }: SuggestionCardProps) {
    const isWeekend = slot.start.getDay() === 0 || slot.start.getDay() === 6;
    const isEarly = slot.start.getHours() < 9;
    const isLate = slot.start.getHours() >= 17;

    return (
        <div
            className={`suggestion-card ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => !disabled && onSelect(slot)}
        >
            <div className="card-header">
                <span className="date-text">
                    {format(slot.start, 'EEE, MMM d')}
                    {isWeekend && <span className="icon" title="Weekend"> 🏖️</span>}
                </span>
            </div>

            <div className="time-display">
                <span className="time-text">{format(slot.start, 'h:mm a')}</span>
                {(isEarly || isLate) && (
                    <span className="icon-warning" title={isEarly ? "Early meeting" : "Late meeting"}>
                        {isEarly ? '⏰' : '🌙'}
                    </span>
                )}
            </div>

            <div className="meta-info">
                {durationMinutes} min · All {userCount} free
            </div>

            <button
                className={`quick-book-btn ${isSelected ? 'selected-btn' : ''}`}
                disabled={disabled}
            >
                {isSelected ? '✓ Selected' : isEarly || isLate || isWeekend ? 'Book Anyway' : 'Quick Book'}
            </button>

            <style jsx>{`
            .suggestion-card {
                background: var(--color-bg-main);
            border: 1px solid var(--color-border);
            border-radius: 8px;
            padding: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            flex-direction: column;
            gap: 4px;
            width: 100%;
            position: relative;
                }

            .suggestion-card:hover:not(.disabled) {
                transform: scale(1.02);
            box-shadow: var(--shadow-md);
            border-color: var(--color-accent);
                }

            .suggestion-card.selected {
                background: var(--color-bg-secondary);
            border-color: var(--color-success);
            transform: scale(1.02);
                }

            .suggestion-card.disabled {
                opacity: 0.5;
            cursor: not-allowed;
            filter: grayscale(1);
                }

            .card-header {
                font - size: 0.85rem;
            font-weight: 700;
            color: var(--color-text-main);
            display: flex;
            justify-content: space-between;
                }

            .time-display {
                display: flex;
            align-items: center;
            gap: 6px;
                }

            .time-text {
                font - size: 1.1rem;
            font-weight: 800;
            color: var(--color-accent);
                }

            .selected .time-text {
                color: var(--color-success);
                }

            .meta-info {
                font - size: 0.75rem;
            color: var(--color-text-secondary);
            margin-bottom: 8px;
                }

            .quick-book-btn {
                margin - top: auto;
            width: 100%;
            padding: 6px 0;
            background: var(--color-accent);
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.2s;
                }

            .quick-book-btn:hover:not(:disabled) {
                filter: brightness(1.1);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }

            .selected-btn {
                background: var(--color-success);
                }

            .icon-warning {
                font - size: 0.9rem;
                }
            `}</style>
        </div >
    );
}
