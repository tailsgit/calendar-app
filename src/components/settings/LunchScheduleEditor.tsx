"use client";

import { useState, useEffect } from "react";

interface LunchScheduleEditorProps {
    schedule: string | null; // JSON string
    onSave: (schedule: string) => void;
    defaultStart: string;
    defaultEnd: string;
}

interface DayConfig {
    start: string;
    end: string;
    enabled: boolean;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function LunchScheduleEditor({
    schedule,
    onSave,
    defaultStart,
    defaultEnd,
}: LunchScheduleEditorProps) {
    const [config, setConfig] = useState<Record<string, DayConfig>>({});

    useEffect(() => {
        let parsed = {};
        try {
            if (schedule) {
                parsed = JSON.parse(schedule);
            }
        } catch (e) {
            console.error("Failed to parse schedule", e);
        }
        setConfig(parsed);
    }, [schedule]);

    const handleDayToggle = (dayIndex: number) => {
        // Not used directly, logic embedded in render for simplicity of state update
    };

    const handleTimeChange = (dayIndex: number, field: 'start' | 'end', value: string) => {
        const key = dayIndex.toString();
        const current = config[key] || { start: defaultStart, end: defaultEnd, enabled: true };

        const newConfig = {
            ...config,
            [key]: { ...current, [field]: value, enabled: true }
        };
        setConfig(newConfig);
        onSave(JSON.stringify(newConfig)); // Auto-save on change for inline editor? or wait?
        // User request "expand and users can input details there". 
        // Usually settings pages might have a global save. 
        // But here the parent `SettingsPage` has a `handleSave`. 
        // `onSave` prop here updates the parent's `profile` state. 
        // So yes, I should call onSave immediately so parent state reflects changes.
    };

    const handleToggleDay = (dayIndex: number, currentEnabled: boolean) => {
        const key = dayIndex.toString();
        const start = config[key]?.start || defaultStart;
        const end = config[key]?.end || defaultEnd;

        // Implement toggle logic
        let newConfig;
        if (currentEnabled) {
            // Disable
            newConfig = { ...config, [key]: { start, end, enabled: false } };
        } else {
            // Enable
            newConfig = { ...config, [key]: { start, end, enabled: true } };
        }
        setConfig(newConfig);
        onSave(JSON.stringify(newConfig));
    };

    return (
        <div className="lunch-schedule-editor">
            <p className="description">Set different lunch times for specific days.</p>

            <div className="schedule-list">
                {DAYS.map((day, index) => {
                    const dayConfig = config[index.toString()];
                    const isEnabled = dayConfig ? dayConfig.enabled : true; // Default to enabled
                    const start = dayConfig ? dayConfig.start : defaultStart;
                    const end = dayConfig ? dayConfig.end : defaultEnd;

                    return (
                        <div key={day} className={`day-row ${isEnabled ? 'active' : 'inactive'}`}>
                            <div className="day-info">
                                <label className="switch-sm">
                                    <input
                                        type="checkbox"
                                        checked={isEnabled}
                                        onChange={() => handleToggleDay(index, isEnabled)}
                                    />
                                    <span className="slider-sm round"></span>
                                </label>
                                <span className="day-name">{day}</span>
                            </div>

                            {isEnabled && (
                                <div className="time-inputs">
                                    <input
                                        type="time"
                                        value={start}
                                        onChange={(e) => handleTimeChange(index, 'start', e.target.value)}
                                    />
                                    <span>-</span>
                                    <input
                                        type="time"
                                        value={end}
                                        onChange={(e) => handleTimeChange(index, 'end', e.target.value)}
                                    />
                                </div>
                            )}
                            {!isEnabled && <span className="no-lunch">No lunch scheduled</span>}
                        </div>
                    );
                })}
            </div>

            <style jsx>{`
                .lunch-schedule-editor {
                    margin-top: var(--spacing-md);
                    padding: var(--spacing-md);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    background: var(--color-bg-secondary); 
                }

                .description {
                    color: var(--color-text-secondary);
                    font-size: 0.9rem;
                    margin-bottom: var(--spacing-md);
                    margin-top: 0;
                }

                .schedule-list {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-xs);
                }

                .day-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 12px;
                    border-radius: var(--radius-md);
                    background: var(--color-bg-main); /* Card background for rows */
                    border: 1px solid transparent;
                }
                
                .day-row.active {
                    border-color: var(--color-border);
                }
                
                .day-row.inactive {
                    opacity: 0.7;
                    background: transparent;
                }

                .day-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    width: 140px;
                }

                .day-name {
                    font-weight: 500;
                    font-size: 0.9rem;
                }

                .time-inputs {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .time-inputs input {
                    background: var(--color-bg-secondary);
                    border: 1px solid var(--color-border);
                    color: var(--color-text-main);
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 0.9rem;
                }
                
                .no-lunch {
                    color: var(--color-text-secondary);
                    font-size: 0.85rem;
                    font-style: italic;
                }

                /* Small Switch */
                .switch-sm {
                    position: relative;
                    display: inline-block;
                    width: 36px;
                    height: 20px;
                }
                .switch-sm input { display:none; }
                .slider-sm {
                    position: absolute;
                    cursor: pointer;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background-color: #ccc;
                    transition: .4s;
                    border-radius: 34px;
                }
                .slider-sm:before {
                    position: absolute;
                    content: "";
                    height: 14px; width: 14px;
                    left: 3px; bottom: 3px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                }
                input:checked + .slider-sm { background-color: var(--color-accent); }
                input:checked + .slider-sm:before { transform: translateX(16px); }
            `}</style>
        </div>
    );
}
