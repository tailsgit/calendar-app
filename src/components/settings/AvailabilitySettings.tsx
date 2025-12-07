"use client";

import { useState, useEffect } from 'react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
}

const DEFAULT_AVAILABILITY: AvailabilitySlot[] = DAYS.map((_, index) => ({
  dayOfWeek: index,
  startTime: '09:00',
  endTime: '17:00',
  isEnabled: false, // All days disabled by default
}));

export default function AvailabilitySettings() {
  const [availability, setAvailability] = useState<AvailabilitySlot[]>(DEFAULT_AVAILABILITY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    try {
      const res = await fetch('/api/user/availability');
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          // Merge fetched data with default structure to ensure all days exist
          const merged = DEFAULT_AVAILABILITY.map(defaultSlot => {
            const found = data.find((d: any) => d.dayOfWeek === defaultSlot.dayOfWeek);
            return found ? { ...found, isEnabled: Boolean(found.isEnabled) } : defaultSlot;
          });
          setAvailability(merged);
        }
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
    setLoading(false);
  };

  const handleToggle = (dayIndex: number) => {
    setAvailability(prev => prev.map((slot, i) =>
      i === dayIndex ? { ...slot, isEnabled: !slot.isEnabled } : slot
    ));
  };

  const handleTimeChange = (dayIndex: number, field: 'startTime' | 'endTime', value: string) => {
    setAvailability(prev => prev.map((slot, i) =>
      i === dayIndex ? { ...slot, [field]: value } : slot
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/user/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability }),
      });

      if (res.ok) {
        setMessage('Availability saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to save availability.');
      }
    } catch (error) {
      console.error('Error saving availability:', error);
      setMessage('Error saving availability.');
    }
    setSaving(false);
  };

  if (loading) return <div>Loading availability...</div>;

  return (
    <div className="availability-settings">
      <div className="settings-header">
        <h3>Weekly Availability</h3>
        <p>Set a time range for when you're typically available for meetings</p>
      </div>

      <div className="availability-list">
        {availability.map((slot, index) => (
          <div key={index} className={`day-row ${slot.isEnabled ? 'enabled' : 'disabled'}`}>
            <label className="day-toggle">
              <input
                type="checkbox"
                checked={slot.isEnabled}
                onChange={() => handleToggle(index)}
              />
              <span className="day-name">{DAYS[index]}</span>
            </label>

            {slot.isEnabled ? (
              <div className="time-range">
                <input
                  type="time"
                  value={slot.startTime}
                  onChange={(e) => handleTimeChange(index, 'startTime', e.target.value)}
                />
                <span>to</span>
                <input
                  type="time"
                  value={slot.endTime}
                  onChange={(e) => handleTimeChange(index, 'endTime', e.target.value)}
                />
              </div>
            ) : (
              <span className="unavailable-text">Unavailable</span>
            )}
          </div>
        ))}
      </div>

      <div className="actions">
        <button className="btn btn-primary save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Availability'}
        </button>
        {message && <span className={`message ${message.includes('Failed') || message.includes('Error') ? 'error' : 'success'}`}>{message}</span>}
      </div>

      <style jsx>{`
        .availability-settings {
          margin-top: var(--spacing-xl);
        }

        .settings-header h3 {
          font-size: 1.25rem;
          margin-bottom: var(--spacing-xs);
        }

        .settings-header p {
          color: var(--color-text-secondary);
          font-size: 0.9rem;
          margin-bottom: var(--spacing-lg);
        }

        .availability-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .day-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-md);
          background: var(--color-bg-secondary);
          border-radius: var(--radius-md);
          transition: background-color var(--transition-fast);
        }

        .day-row.disabled {
            background: var(--color-bg-main);
            border: 1px dashed var(--color-border);
            opacity: 0.7;
        }

        .day-toggle {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          cursor: pointer;
        }

        .day-toggle input {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .day-name {
          font-weight: 500;
          min-width: 100px;
        }

        .time-range {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .time-range input {
          padding: 0.375rem 0.5rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-family: inherit;
          background: var(--color-bg-main);
          color: var(--color-text-main);
        }

        .time-range span {
          color: var(--color-text-secondary);
        }

        .unavailable-text {
          color: var(--color-text-light);
          font-style: italic;
        }

        .actions {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
            margin-top: var(--spacing-lg);
        }

        .message {
            font-size: 0.9rem;
            font-weight: 500;
        }
        
        .message.success { color: var(--color-success); }
        .message.error { color: var(--color-error); }

        @media (max-width: 640px) {
          .day-row {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-sm);
          }

          .time-range {
            margin-left: 34px;
          }
        }
      `}</style>
    </div>
  );
}
