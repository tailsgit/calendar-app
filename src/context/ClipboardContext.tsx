"use client";

import { createContext, useContext, useState, ReactNode } from 'react';
import toast from 'react-hot-toast';

interface Event {
    id: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    locationType?: string;
    color: string;
    recurrence?: string;
    status?: string;
    ownerId?: string;
    participants?: any[];
}

interface ClipboardContextType {
    clipboardEvents: Event[];
    copyEvent: (event: Event) => void;
    clearClipboard: () => void;
    hasItems: boolean;
}

const ClipboardContext = createContext<ClipboardContextType | undefined>(undefined);

export function ClipboardProvider({ children }: { children: ReactNode }) {
    const [clipboardEvents, setClipboardEvents] = useState<Event[]>([]);

    const copyEvent = (event: Event) => {
        // We can allow multiple copies or just single. 
        // For now, let's just append to clipboard like a stack or just Replace?
        // User request "paste what i copited" implies the last thing.
        // Existing implementation in CalendarContainer was `[...clipboardEvents, event]`.
        // Let's keep that behavior.
        setClipboardEvents(prev => [...prev, event]);
        toast.success('Event copied to clipboard');
    };

    const clearClipboard = () => {
        setClipboardEvents([]);
    };

    return (
        <ClipboardContext.Provider value={{
            clipboardEvents,
            copyEvent,
            clearClipboard,
            hasItems: clipboardEvents.length > 0
        }}>
            {children}
        </ClipboardContext.Provider>
    );
}

export function useClipboard() {
    const context = useContext(ClipboardContext);
    if (context === undefined) {
        throw new Error('useClipboard must be used within a ClipboardProvider');
    }
    return context;
}
