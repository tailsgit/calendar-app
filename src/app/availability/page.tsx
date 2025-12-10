"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Save, Trash2, X, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface AvailabilitySlot {
    id?: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7 AM - 9 PM

// Helper to format HH:MM to 12-hour
const formatTime12 = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const ampm = h < 12 ? 'AM' : 'PM';
    const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
};

// Helper to convert time string to minutes
const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

// Helper to convert minutes to time string
const minutesToTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export default function AvailabilityPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
    const [editingSlot, setEditingSlot] = useState<{ slot: AvailabilitySlot, index: number } | null>(null);

    useEffect(() => {
        fetchAvailability();
    }, []);

    const fetchAvailability = async () => {
        try {
            const res = await fetch('/api/user/availability');
            if (res.ok) {
                const data = await res.json();
                setSlots(data.map((s: any) => ({
                    id: s.id,
                    dayOfWeek: s.dayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime
                })));
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

    const handleCopyLink = () => {
        if (!session?.user?.id) {
            toast.error('User ID not found');
            return;
        }
        const link = `${window.location.origin}/user/${session.user.id}`;
        navigator.clipboard.writeText(link);
        toast.success('Booking link copied to clipboard!');
    };

    const handleGridClick = (dayIndex: number, hour: number) => {
        const startTime = `${hour.toString().padStart(2, '0')}:00`;
        const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

        // Check for overlap
        const newStart = timeToMinutes(startTime);
        const newEnd = timeToMinutes(endTime);

        const hasOverlap = slots.some(s => {
            if (s.dayOfWeek !== dayIndex) return false;
            const sStart = timeToMinutes(s.startTime);
            const sEnd = timeToMinutes(s.endTime);
            return (newStart < sEnd && newEnd > sStart);
        });

        if (hasOverlap) return;

        const newSlot = { dayOfWeek: dayIndex, startTime, endTime };
        setSlots([...slots, newSlot]);
    };

    const handleSlotClick = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();

        // 3-Click Rule Implementation:
        // 1. First Click -> Add
        // 2. Second Click -> Edit
        // 3. Third Click -> Remove
        if (editingSlot && editingSlot.index === index) {
            deleteSlot(index);
        } else {
            setEditingSlot({ slot: slots[index], index });
        }
    };

    const updateSlot = (index: number, updates: Partial<AvailabilitySlot>) => {
        const updated = [...slots];
        updated[index] = { ...updated[index], ...updates };
        setSlots(updated);
        setEditingSlot({ slot: updated[index], index });
    };

    const deleteSlot = (index: number) => {
        const updated = slots.filter((_, i) => i !== index);
        setSlots(updated);
        setEditingSlot(null);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/user/availability', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ availability: slots })
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

    // Generate time options for select
    const timeOptions = Array.from({ length: 48 }).map((_, i) => {
        const h = Math.floor(i / 2);
        const m = (i % 2) * 30;
        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const label = `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m === 0 ? '00' : '30'} ${h < 12 ? 'AM' : 'PM'}`;
        return { value: time, label };
    });

    if (loading) return <div className="p-8 text-center text-neutral-500">Loading schedule...</div>;

    return (
        <div className="availability-page container">
            <div className="header">
                <div className="header-top">
                    <h1>Booking</h1>
                    <button className="btn btn-secondary" onClick={handleCopyLink} title="Generate Booking Link">
                        <LinkIcon size={16} className="mr-2" /> Copy Link
                    </button>
                </div>
                <p className="link-description">
                    Share this link to let others book time with you. They can sign in and schedule meetings during your available slots.
                </p>
                <p className="grid-help">
                    Click on the grid to add availability. Click an existing slot to edit.
                </p>
            </div>

            <div className="visual-grid-container">
                <div className="v-time-col">
                    <div className="v-header-cell"></div>
                    {HOURS.map(h => (
                        <div key={h} className="v-time-cell">
                            {h > 12 ? h - 12 : h} {h >= 12 ? 'PM' : 'AM'}
                        </div>
                    ))}
                </div>
                {DAYS.map((day, dayIndex) => (
                    <div key={day} className="v-day-col">
                        <div className="v-header-cell">{day}</div>
                        <div className="v-day-content">
                            {HOURS.map(h => (
                                <div
                                    key={h}
                                    className="v-hour-cell"
                                    onClick={() => handleGridClick(dayIndex, h)}
                                />
                            ))}

                            {slots.filter(s => s.dayOfWeek === dayIndex).map((slot, idx) => {
                                const startMin = timeToMinutes(slot.startTime);
                                const endMin = timeToMinutes(slot.endTime);
                                const duration = endMin - startMin;
                                const gridStartMin = 7 * 60;

                                const top = ((startMin - gridStartMin) / 60) * 50;
                                const height = (duration / 60) * 50;
                                const originalIndex = slots.indexOf(slot);

                                return (
                                    <div
                                        key={idx}
                                        className="v-slot"
                                        style={{ top: `${top}px`, height: `${height}px` }}
                                        onClick={(e) => handleSlotClick(e, originalIndex)}
                                    >
                                        <span>{formatTime12(slot.startTime)} - {formatTime12(slot.endTime)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {editingSlot && (
                <>
                    <div className="popover-backdrop" onClick={() => setEditingSlot(null)} />
                    <div className="edit-popover">
                        <div className="popover-header">
                            <h3>Edit Availability</h3>
                            <button className="icon-btn" onClick={() => setEditingSlot(null)}><X size={16} /></button>
                        </div>

                        <div className="popover-body">
                            <label>Start</label>
                            <select
                                value={editingSlot.slot.startTime}
                                onChange={(e) => updateSlot(editingSlot.index, { startTime: e.target.value })}
                            >
                                {timeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>

                            <label>End</label>
                            <select
                                value={editingSlot.slot.endTime}
                                onChange={(e) => updateSlot(editingSlot.index, { endTime: e.target.value })}
                            >
                                {timeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>

                        <div className="popover-footer">
                            <button className="btn btn-danger" onClick={() => deleteSlot(editingSlot.index)}>
                                <Trash2 size={16} /> Remove
                            </button>
                            <button className="btn btn-primary" onClick={() => setEditingSlot(null)}>Done</button>
                        </div>
                    </div>
                </>
            )}

            <div className="actions-bar">
                <button className="btn btn-primary save-btn" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                </button>
            </div>

            <style jsx>{`
        .availability-page {
          padding-bottom: 5rem;
        }
        
        .header { margin-bottom: 2rem; }

        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }

        .link-description {
            color: var(--color-text-secondary);
            font-size: 0.95rem;
            margin-bottom: 1rem;
            max-width: 600px;
        }

        .grid-help {
            font-size: 0.85rem;
            color: var(--color-text-light);
            background: var(--color-bg-secondary);
            padding: 8px 12px;
            border-radius: var(--radius-md);
            display: inline-block;
        }
        
        .visual-grid-container {
          display: flex;
          background: var(--color-bg-main);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        
        .v-time-col {
          width: 60px;
          flex-shrink: 0;
          border-right: 1px solid var(--color-border);
        }
        
        .v-day-col {
          flex: 1;
          border-right: 1px solid var(--color-border);
          min-width: 100px;
        }
        .v-day-col:last-child { border-right: none; }
        
        .v-header-cell {
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-bottom: 1px solid var(--color-border);
          font-weight: 600;
          background: var(--color-bg-secondary);
          color: var(--color-text-secondary);
          font-size: 0.9rem;
        }
        
        .v-time-cell {
          height: 50px;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 4px;
          font-size: 0.75rem;
          color: var(--color-text-light);
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        
        .v-day-content {
          position: relative;
          height: ${HOURS.length * 50}px;
        }
        
        .v-hour-cell {
          height: 50px;
          border-bottom: 1px solid var(--color-border);
          cursor: pointer;
        }
        .v-hour-cell:hover {
          background: rgba(var(--color-accent-rgb), 0.05);
        }
        
        .v-slot {
          position: absolute;
          left: 4px;
          right: 4px;
          background: var(--color-accent);
          color: white;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: 1px solid white;
          box-shadow: 0 1px 2px rgba(0,0,0,0.2);
          overflow: hidden;
          z-index: 10;
        }
        
        .popover-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.3);
          z-index: 90;
        }
        
        .edit-popover {
          position: fixed;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          background: var(--color-bg-main);
          padding: var(--spacing-lg);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xl);
          z-index: 100;
          width: 300px;
          border: 1px solid var(--color-border);
        }
        
        .popover-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: var(--spacing-md);
        }
        
        .popover-body {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-md);
        }
        
        .popover-footer {
          display: flex;
          justify-content: space-between;
        }
        
        .actions-bar {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          z-index: 80;
        }
        
        .icon-btn {
          padding: 4px;
          border-radius: 50%;
        }
        .icon-btn:hover { background: var(--color-bg-secondary); }
        
        .btn-danger {
          color: var(--color-error);
          background: rgba(239, 68, 68, 0.1);
        }
        .btn-danger:hover { background: rgba(239, 68, 68, 0.2); }
      `}</style>
        </div>
    );
}
