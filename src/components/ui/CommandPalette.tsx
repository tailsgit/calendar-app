
"use client";

import { useEffect, useState } from 'react';
import { Command } from 'cmdk'; // Radix-like accessible command menu
import * as chrono from 'chrono-node';
import { useRouter } from 'next/navigation';
import {
    Calendar,
    Settings,
    Users,
    Plus,
    Search,
    Zap,
    ArrowRight
} from 'lucide-react';
import Modal from './Modal';
import NewMeetingForm from '../meeting/NewMeetingForm';
import { format } from 'date-fns';

export default function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const router = useRouter();

    // State for Smart Create Modal
    const [smartCreateOpen, setSmartCreateOpen] = useState(false);
    const [smartData, setSmartData] = useState<{ date?: string, time?: string, title?: string }>({});

    // Toggle with Cmd+K
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const handleSmartAction = () => {
        // Parse the search query
        const results = chrono.parse(search);

        if (results.length > 0) {
            const result = results[0];
            const date = result.start.date();
            const dateStr = format(date, 'yyyy-MM-dd');
            const timeStr = format(date, 'HH:mm');

            // Naive title extraction: Remove the matched date text from the original string
            const title = search.replace(result.text, '').trim() || 'New Meeting';

            setSmartData({
                date: dateStr,
                time: timeStr,
                title: title
            });
            setOpen(false);
            setSmartCreateOpen(true);
        } else {
            // Fallback if no date found
            setSmartData({ title: search });
            setOpen(false);
            setSmartCreateOpen(true);
        }
        setSearch('');
    };

    return (
        <>
            {open && (
                <div className="command-backdrop" onClick={() => setOpen(false)}>
                    <div className="command-wrapper" onClick={(e) => e.stopPropagation()}>
                        <Command label="Global Command Menu" loop className="command-root">
                            <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
                                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                <Command.Input
                                    value={search}
                                    onValueChange={setSearch}
                                    placeholder="Type a command or search..."
                                    className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>

                            <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
                                <Command.Empty className="py-6 text-center text-sm">
                                    No results found.
                                    {search.length > 3 && (
                                        <button
                                            onClick={handleSmartAction}
                                            className="mt-2 text-primary flex items-center justify-center w-full hover:bg-neutral-100 p-2 rounded"
                                        >
                                            <Plus size={14} className="mr-1" /> Create "{search}"
                                        </button>
                                    )}
                                </Command.Empty>

                                <Command.Group heading="Smart Actions">
                                    {search.length > 0 && (
                                        <Command.Item
                                            value="create-smart"
                                            onSelect={handleSmartAction}
                                            className="command-item"
                                        >
                                            <Zap className="mr-2 h-4 w-4" />
                                            <span>Create "{search}"</span>
                                            <span className="ml-auto text-xs text-neutral-400">Enter</span>
                                        </Command.Item>
                                    )}
                                </Command.Group>

                                <Command.Group heading="Navigation">
                                    <Command.Item
                                        value="calendar"
                                        onSelect={() => { router.push('/'); setOpen(false); }}
                                        className="command-item"
                                    >
                                        <Calendar className="mr-2 h-4 w-4" />
                                        <span>Go to Calendar</span>
                                    </Command.Item>
                                    <Command.Item
                                        value="team"
                                        onSelect={() => { router.push('/team'); setOpen(false); }}
                                        className="command-item"
                                    >
                                        <Users className="mr-2 h-4 w-4" />
                                        <span>Go to Team</span>
                                    </Command.Item>
                                    <Command.Item
                                        value="settings"
                                        onSelect={() => { router.push('/settings'); setOpen(false); }}
                                        className="command-item"
                                    >
                                        <Settings className="mr-2 h-4 w-4" />
                                        <span>Settings</span>
                                    </Command.Item>
                                </Command.Group>
                            </Command.List>
                        </Command>
                    </div>
                </div>
            )}

            {/* Smart Create Modal (Reusing NewMeetingForm logic) */}
            <Modal
                isOpen={smartCreateOpen}
                onClose={() => setSmartCreateOpen(false)}
                title="Create from Command"
            >
                <NewMeetingForm
                    onClose={() => setSmartCreateOpen(false)}
                    onSuccess={() => window.location.reload()} // Simple reload for now to refresh calendar
                    initialDate={smartData.date}
                    initialTime={smartData.time}
                    initialTitle={smartData.title}
                />
            </Modal>

            <style jsx global>{`
        .command-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(2px);
        }
        
        .command-wrapper {
            background: white;
            border-radius: 12px;
            width: 100%;
            max-width: 640px;
            box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
            overflow: hidden;
            animation: fadeIn 0.1s ease-out;
        }

        .command-item {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            font-size: 14px;
            border-radius: 6px;
            cursor: pointer;
            color: var(--color-text-main);
        }

        .command-item[data-selected='true'] {
            background-color: var(--color-bg-secondary);
            color: var(--color-text-main);
        }
        
        [cmdk-group-heading] {
            padding: 8px 12px 4px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            color: var(--color-text-secondary);
            margin-top: 8px;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.98); }
            to { opacity: 1; transform: scale(1); }
        }
      `}</style>
        </>
    );
}
