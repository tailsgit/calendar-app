"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Check, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface AvailabilitySlot {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isEnabled: boolean;
}

const DAYS = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
];

// Generate time options (every 30 mins)
const TIME_OPTIONS = Array.from({ length: 48 }).map((_, i) => {
    const hour = Math.floor(i / 2);
    const min = (i % 2) * 30;
    const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour < 12 ? 'AM' : 'PM';
    const label = `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;

    return { value: time, label };
});

export default function AvailabilityPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [schedule, setSchedule] = useState<AvailabilitySlot[]>([]);

    useEffect(() => {
        fetchAvailability();
    }, []);

    const fetchAvailability = async () => {
        try {
            const res = await fetch('/api/user/availability');
            if (res.ok) {
                const data = await res.json();

                // Merge with defaults to ensure all 7 days exist
                const fullSchedule = Array.from({ length: 7 }).map((_, i) => {
                    const existing = data.find((s: any) => s.dayOfWeek === i);
                    return existing || {
                        dayOfWeek: i,
                        startTime: '09:00',
                        endTime: '17:00',
                        isEnabled: i !== 0 && i !== 6 // Default: Mon-Fri enabled
                    };
                });

                setSchedule(fullSchedule);
            } else {
                toast.error('Failed to load availability');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error loading data');
        } finally {
            setLoading(false);
        }
    };

    const handleDayToggle = (dayIndex: number) => {
        setSchedule(prev => prev.map(slot =>
            slot.dayOfWeek === dayIndex
                ? { ...slot, isEnabled: !slot.isEnabled }
                : slot
        ));
    };

    const handleTimeChange = (dayIndex: number, field: 'startTime' | 'endTime', value: string) => {
        setSchedule(prev => prev.map(slot => {
            if (slot.dayOfWeek !== dayIndex) return slot;

            const newSlot = { ...slot, [field]: value };

            // Auto-adjust end time if start time is after end time
            if (field === 'startTime' && newSlot.endTime <= value) {
                // Find next slot (30 mins later)
                const timeIndex = TIME_OPTIONS.findIndex(t => t.value === value);
                if (timeIndex < TIME_OPTIONS.length - 1) {
                    newSlot.endTime = TIME_OPTIONS[timeIndex + 2]?.value || TIME_OPTIONS[TIME_OPTIONS.length - 1].value;
                }
            }

            return newSlot;
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/user/availability', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ availability: schedule })
            });

            if (res.ok) {
                toast.success('Availability saved!');
                router.refresh();
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            toast.error('Error saving availability');
        } finally {
            setSaving(false);
        }
    };

    const copyToAllDays = (sourceDayIndex: number) => {
        const source = schedule.find(s => s.dayOfWeek === sourceDayIndex);
        if (!source) return;

        setSchedule(prev => prev.map(slot => {
            if (slot.dayOfWeek === sourceDayIndex) return slot; // Skip source
            // Only copy to enabled days or all? Let's just update all Mon-Fri to match
            if (slot.dayOfWeek === 0 || slot.dayOfWeek === 6) return slot; // Skip weekends

            return {
                ...slot,
                startTime: source.startTime,
                endTime: source.endTime,
                isEnabled: true
            };
        }));
        toast.success('Copied to all weekdays');
    };

    if (loading) return <div className="p-8 text-center text-neutral-500">Loading schedule...</div>;

    return (
        <div className="availability-page container">
            <div className="header">
                <h1>Office Hours</h1>
                <p>Set your recurring weekly availability.</p>
            </div>

            <div className="schedule-card">
                {schedule.map((slot) => (
                    <div key={slot.dayOfWeek} className={`day-row ${slot.isEnabled ? 'enabled' : 'disabled'}`}>
                        <div className="day-check">
                            <input
                                type="checkbox"
                                id={`day-${slot.dayOfWeek}`}
                                checked={slot.isEnabled}
                                onChange={() => handleDayToggle(slot.dayOfWeek)}
                            />
                            <label htmlFor={`day-${slot.dayOfWeek}`}>{DAYS[slot.dayOfWeek]}</label>
                        </div>

                        <div className="time-selectors">
                            {slot.isEnabled ? (
                                <>
                                    <select
                                        value={slot.startTime}
                                        onChange={(e) => handleTimeChange(slot.dayOfWeek, 'startTime', e.target.value)}
                                    >
                                        {TIME_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                    <span className="separator">-</span>
                                    <select
                                        value={slot.endTime}
                                        onChange={(e) => handleTimeChange(slot.dayOfWeek, 'endTime', e.target.value)}
                                    >
                                        {TIME_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>

                                    <button
                                        className="copy-btn"
                                        title="Copy to all weekdays"
                                        onClick={() => copyToAllDays(slot.dayOfWeek)}
                                    >
                                        Copy
                                    </button>
                                </>
                            ) : (
                                <span className="unavailable-text">Unavailable</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="actions">
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : (
                        <>
                            <Save size={18} className="mr-2" />
                            Save Changes
                        </>
                    )}
                </button>
            </div>

            <style jsx>{`
        .availability-page {
          max-width: 800px;
          margin: 0 auto;
          padding-bottom: 4rem;
        }

        .header {
          margin-bottom: var(--spacing-xl);
        }

        .header h1 {
          font-size: 2rem;
          margin-bottom: var(--spacing-xs);
        }

        .header p {
          color: var(--color-text-secondary);
        }

        .schedule-card {
          background: var(--color-bg-main);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          box-shadow: var(--shadow-sm);
        }

        .day-row {
          display: flex;
          align-items: center;
          padding: var(--spacing-md) 0;
          border-bottom: 1px solid var(--color-border);
        }

        .day-row:last-child {
          border-bottom: none;
        }

        .day-check {
          width: 150px;
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          font-weight: 500;
        }
        
        .day-check input {
          width: 18px;
          height: 18px;
          accent-color: var(--color-accent);
          cursor: pointer;
        }

        .day-check label {
          cursor: pointer;
        }

        .time-selectors {
          flex: 1;
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        select {
          padding: 0.5rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-bg-secondary);
          color: var(--color-text-main);
          font-family: inherit;
        }

        .separator {
          color: var(--color-text-secondary);
        }

        .unavailable-text {
          color: var(--color-text-light);
          font-style: italic;
        }

        .copy-btn {
          margin-left: auto;
          font-size: 0.8rem;
          color: var(--color-accent);
          opacity: 0;
          transition: opacity var(--transition-fast);
        }

        .day-row:hover .copy-btn {
          opacity: 1;
        }
        
        .day-row:hover .copy-btn:hover {
          text-decoration: underline;
        }

        .actions {
          margin-top: var(--spacing-xl);
          display: flex;
          justify-content: flex-end;
        }
        
        @media (max-width: 600px) {
          .day-row {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-sm);
          }
          
          .time-selectors {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
        </div>
    );
}
