
"use client";

import { useMemo, useState } from 'react';
import Modal from '../ui/Modal';
import { RenderableEvent, ConflictGroup } from '@/lib/conflict-detection';
import { format } from 'date-fns';
import { Calendar, Clock, ArrowRight } from 'lucide-react';

interface ConflictResolverModalProps {
    isOpen: boolean;
    onClose: () => void;
    conflictGroup: ConflictGroup | null;
    onReschedule: (event: any, newStart: Date) => Promise<void>;
}

export default function ConflictResolverModal({ isOpen, onClose, conflictGroup, onReschedule }: ConflictResolverModalProps) {
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [newStartTime, setNewStartTime] = useState<string>('');
    const [newDate, setNewDate] = useState<string>('');

    // Reset state when modal opens/closes
    if (!isOpen && selectedEventId) {
        setSelectedEventId(null);
    }

    const handleSave = async () => {
        if (!selectedEventId || !conflictGroup || !newStartTime || !newDate) return;

        const event = conflictGroup.events.find(e => e.id === selectedEventId);
        if (!event) return;

        // Construct new Date
        const start = new Date(`${newDate}T${newStartTime}`);

        await onReschedule(event, start);
        onClose();
        setSelectedEventId(null);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Resolve Conflict">
            <div className="space-y-6">
                <p className="text-sm text-neutral-600">
                    The following events are overlapping. Select one to move it to a different time.
                </p>

                <div className="space-y-3">
                    {conflictGroup?.events.map((event) => (
                        <div
                            key={event.id}
                            className={`p-4 border rounded-lg transition-all cursor-pointer ${selectedEventId === event.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-neutral-200 hover:border-primary/50'}`}
                            onClick={() => {
                                setSelectedEventId(event.id);
                                // Default the inputs to current values of the selected event
                                setNewDate(format(new Date(event.startTime), 'yyyy-MM-dd'));
                                setNewStartTime(format(new Date(event.startTime), 'HH:mm'));
                            }}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <h4 className="font-semibold text-neutral-900">{event.title}</h4>
                                    <div className="flex items-center text-sm text-neutral-500 mt-1">
                                        <Clock size={14} className="mr-1" />
                                        {format(new Date(event.startTime), 'h:mm a')} - {format(new Date(event.endTime), 'h:mm a')}
                                    </div>
                                    <div className="text-xs text-neutral-400 mt-1 uppercase tracking-wider">
                                        {event.source || 'Local'}
                                    </div>
                                </div>
                                {selectedEventId === event.id && (
                                    <div className="text-primary">
                                        <ArrowRight size={20} />
                                    </div>
                                )}
                            </div>

                            {/* Reschedule Inputs (Only visible when selected) */}
                            {selectedEventId === event.id && (
                                <div className="mt-4 pt-4 border-t border-neutral-100 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                    <div>
                                        <label className="block text-xs font-medium text-neutral-500 mb-1">New Date</label>
                                        <input
                                            type="date"
                                            className="w-full px-2 py-1.5 border border-neutral-300 rounded text-sm"
                                            value={newDate}
                                            onChange={e => setNewDate(e.target.value)}
                                            onClick={e => e.stopPropagation()}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-neutral-500 mb-1">New Start Time</label>
                                        <input
                                            type="time"
                                            className="w-full px-2 py-1.5 border border-neutral-300 rounded text-sm"
                                            value={newStartTime}
                                            onChange={e => setNewStartTime(e.target.value)}
                                            onClick={e => e.stopPropagation()}
                                        />
                                    </div>
                                    <div className="col-span-2 flex justify-end mt-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSave();
                                            }}
                                            className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                                        >
                                            Confirm Move
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    );
}
