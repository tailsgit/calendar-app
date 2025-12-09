"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import Fuse from 'fuse.js';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import * as chrono from 'chrono-node';

interface Contact {
    id: string;
    name: string;
    email: string;
    image: string | null;
}

interface VoiceInputProps {
    onResult: (data: { title: string; start: Date; end?: Date; description?: string; location?: string; attendees?: Contact[]; isUpdate?: boolean }) => void;
}

export default function VoiceInput({ onResult }: VoiceInputProps) {
    const [listening, setListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);

    useEffect(() => {
        // Pre-fetch contacts for fuzzy matching
        fetch('/api/users/search?q=')
            .then(res => res.json())
            .then(data => {
                if (data.users) setContacts(data.users);
            })
            .catch(err => console.error("Failed to load contacts for voice", err));
    }, []);

    const processCommand = useCallback((text: string) => {
        if (!text.trim()) return;

        // --- 1. Pre-Processing Utility ---
        const normalizeText = (input: string) => {
            let s = input;
            // "6-8" or "6 - 8" -> "6 to 8" (Time Ranges)
            s = s.replace(/(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)\s*-\s*(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)/gi, '$1 to $2');
            s = s.replace(/\s+/g, ' ');
            s = s.replace(/\b(umm|uhh|like)\b/gi, '');
            return s.trim();
        };

        const normalizedText = normalizeText(text);

        try {
            // --- 2. Advanced Parsing with Negation Handling ---
            const correctionRegex = /\b(actually|no wait|change that to|instead)\b/i;
            const match = normalizedText.match(correctionRegex);

            let dateToUse: { start: Date, end?: Date, textMatched: string } | null = null;
            let textForTitle = normalizedText;

            if (match && match.index !== undefined) {
                // Split into Part A (original) and Part B (correction)
                const partA = normalizedText.slice(0, match.index).trim();
                const partB = normalizedText.slice(match.index + match[0].length).trim();

                console.log(`[Voice Parse] Correction detected. A: "${partA}" | B: "${partB}"`);

                // Step 1: Run Chrono on Part B
                const resultsB = chrono.parse(partB, new Date(), { forwardDate: true });
                if (resultsB.length > 0) {
                    const res = resultsB[0];
                    dateToUse = {
                        start: res.start.date(),
                        end: res.end ? res.end.date() : undefined,
                        textMatched: res.text
                    };
                    textForTitle = `${partA} ${partB}`;

                    // Remove the matched text from Part B using index to be precise
                    // original text: partB
                    // match index: res.index
                    // match length: res.text.length
                    // We need to reconstruct textForTitle carefully.
                    // Actually, simpler approach for Title Reconstruction:
                    // 1. Clean Part A of any dates (if present)
                    // 2. Clean Part B of strict date match
                    // 3. Combine.

                    let cleanPartA = partA;
                    const resultsA = chrono.parse(partA, new Date());
                    if (resultsA.length > 0) {
                        // Remove all date matches from A to avoid confusion
                        // Iterate backwards to not mess up indices?
                        resultsA.reverse().forEach(r => {
                            cleanPartA = cleanPartA.slice(0, r.index) + cleanPartA.slice(r.index + r.text.length);
                        });
                    }

                    let cleanPartB = partB;
                    // We already have resultsB[0] as the active date, but let's clean ALL date text from B to get the "Title" part
                    // e.g. "Dinner at 6pm" -> "Dinner "
                    const allResultsB = chrono.parse(partB, new Date());
                    allResultsB.reverse().forEach(r => {
                        cleanPartB = cleanPartB.slice(0, r.index) + cleanPartB.slice(r.index + r.text.length);
                    });

                    textForTitle = `${cleanPartA} ${cleanPartB}`;

                } else {
                    // Step 2b: Fallback to Part A
                    console.log("[Voice Parse] Correction had no date. Using Part A for date.");
                    const resultsA = chrono.parse(partA, new Date(), { forwardDate: true });
                    if (resultsA.length > 0) {
                        const res = resultsA[0];
                        dateToUse = {
                            start: res.start.date(),
                            end: res.end ? res.end.date() : undefined,
                            textMatched: res.text
                        };
                        // Clean A of the date we used
                        textForTitle = partA.slice(0, res.index) + partA.slice(res.index + res.text.length);
                        textForTitle = `${textForTitle} ${partB}`; // Append B content which is the correction (e.g. "actually meeting")
                    } else {
                        // No date in A or B? 
                        textForTitle = `${partA} ${partB}`;
                    }
                }
            } else {
                // Standard Parse
                const results = chrono.parse(normalizedText, new Date(), { forwardDate: true });
                if (results.length > 0) {
                    const res = results[0];
                    dateToUse = {
                        start: res.start.date(),
                        end: res.end ? res.end.date() : undefined,
                        textMatched: res.text
                    };
                    // Robust cleaning using index
                    textForTitle = normalizedText.slice(0, res.index) + normalizedText.slice(res.index + res.text.length);
                }
            }

            // Fallback Date Logic
            if (!dateToUse) {
                const now = new Date();
                const nextHour = new Date(now);
                nextHour.setHours(now.getHours() + 1, 0, 0, 0);
                dateToUse = {
                    start: nextHour,
                    end: new Date(nextHour.getTime() + 60 * 60 * 1000),
                    textMatched: ''
                };
            }

            const { start } = dateToUse;
            let { end } = dateToUse;

            // Duration inference logic (if not parsed)
            if (!end) {
                // Strict duration regex: "for X hours/mins"
                // Prevent matching "for lunch" -> NaN
                const durationMatch = normalizedText.match(/\bfor\s+(\d+(?:\.\d+)?)\s*(hour|hr|minute|min)s?\b/i);
                if (durationMatch) {
                    const amount = parseFloat(durationMatch[1]);
                    const unit = durationMatch[2].toLowerCase();
                    const msToAdd = amount * (unit.startsWith('h') ? 3600000 : 60000);
                    end = new Date(start.getTime() + msToAdd);
                } else {
                    end = new Date(start.getTime() + 60 * 60 * 1000);
                }
            }

            // --- 4. Intelligent Title & Metadata ---
            // textForTitle is already theoretically stripped of dates by the logic above.
            // But let's double check if we missed anything or if 'dateToUse.textMatched' is still needed for safety.
            // If we used index-slicing above, we don't need to replace 'dateToUse.textMatched'.
            let cleanText = textForTitle;
            cleanText = cleanText.replace(correctionRegex, ' ');
            const meta: string[] = [];

            // A. Recurrence
            const recurrenceMatch = cleanText.match(/\b(every|each)\s+(day|week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekday|weekend)\b/i);
            if (recurrenceMatch) {
                meta.push(`↻ Recurring: ${recurrenceMatch[0]}`);
                cleanText = cleanText.replace(recurrenceMatch[0], '');
            }

            // B. Attendees
            const attendeeMatch = cleanText.match(/\bwith\s+([A-Z][a-z]+(?:(?:\s+and\s+|,\s+)[A-Z][a-z]+)*)/);
            const resolvedAttendees: Contact[] = [];
            if (attendeeMatch) {
                const rawNames = attendeeMatch[1].split(/,| and /).map(s => s.trim()).filter(Boolean);
                const unresolvedNames: string[] = [];
                if (contacts.length > 0) {
                    const fuse = new Fuse(contacts, { keys: ['name'], threshold: 0.3, includeScore: true });
                    rawNames.forEach(name => {
                        const searchResults = fuse.search(name);
                        if (searchResults.length > 0 && searchResults[0].score! < 0.25) {
                            resolvedAttendees.push(searchResults[0].item);
                        } else {
                            unresolvedNames.push(name);
                        }
                    });
                } else {
                    unresolvedNames.push(...rawNames);
                }
                if (resolvedAttendees.length > 0) meta.push(`👥 With: ${resolvedAttendees.map(c => c.name).join(', ')}`);
                if (unresolvedNames.length > 0) meta.push(`👥 With (External): ${unresolvedNames.join(', ')}`);
                cleanText = cleanText.replace(attendeeMatch[0], '');
            }

            // C. Location
            let locationType = 'video';
            const locationMatch = cleanText.match(/\b(at|in)\s+(the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*|conference room|office|home|starbucks|coffee|cafe|room \d+)\b/i);
            if (locationMatch) {
                const locName = locationMatch[3];
                if (!/^\d+$/.test(locName)) {
                    meta.push(`📍 Location: ${locName}`);
                    cleanText = cleanText.replace(locationMatch[0], '');
                    const lowerLoc = locName.toLowerCase();
                    if (['room', 'office', 'coffee', 'starbucks'].some(k => lowerLoc.includes(k))) {
                        locationType = 'in_person';
                    }
                }
            }
            if (/\b(zoom|meet|teams|skype|video call|virtual)\b/i.test(normalizedText)) locationType = 'video';
            else if (/\b(phone|call|mobile|dial)\b/i.test(normalizedText)) locationType = 'phone';
            else if (/\b(walk|lunch|dinner|coffee|meet up)\b/i.test(normalizedText)) locationType = 'in_person';

            // D. Priority
            if (/\b(urgent|important|asap)\b/i.test(cleanText)) {
                meta.push(`🔥 Priority: High`);
                cleanText = cleanText.replace(/\basap\b/i, '');
            }

            // Clean Title
            let title = cleanText;
            const prepositions = ['at', 'on', 'in', 'for', 'from', 'to', 'until', 'during', 'with'];
            const prepRegex = new RegExp(`^\\s*(${prepositions.join('|')})\\b|\\b(${prepositions.join('|')})\\s*$`, 'gi');
            let prevTitle = '';
            while (title !== prevTitle) {
                prevTitle = title;
                title = title.replace(prepRegex, '').trim();
            }
            title = title.replace(/\s+/g, ' ').trim();
            if (title.length === 0) title = "New Event";
            title = title.charAt(0).toUpperCase() + title.slice(1);

            console.log(`[Voice Parse] Raw: "${text}" | Title: "${title}"`);

            // --- 5. Context Update Detection ("Move that") ---
            const updateRegex = /\b(move|change|reschedule|shift|delay|postpone)\b.*\b(that|it|meeting|event)\b/i;
            const isUpdate = updateRegex.test(normalizedText);

            // --- 6. Smart Scheduling ("Find 30 min") ---
            const findTimeMatch = normalizedText.match(/(?:find|book|schedule)\s+(?:a\s+)?(?:time|slot|meeting)\s+for\s+(\d+(?:\.\d+)?)\s*(min|minute|hour|hr)/i);
            if (findTimeMatch) {
                const amount = parseFloat(findTimeMatch[1]);
                const unit = findTimeMatch[2].toLowerCase();
                const durationMinutes = Math.ceil(amount * (unit.startsWith('h') ? 60 : 1));

                console.log(`[Voice Parse] Smart Schedule Detected: ${durationMinutes} mins`);

                fetch(`/api/availability/suggest?duration=${durationMinutes}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.available && data.slot) {
                            onResult({
                                title,
                                start: new Date(data.slot.start),
                                end: new Date(data.slot.end),
                                description: (meta.length > 0 ? meta.join('\n') : '') + `\n🤖 Auto-scheduled (${durationMinutes}m slot found)`,
                                location: locationType,
                                attendees: resolvedAttendees,
                                isUpdate
                            });
                        } else {
                            setError("Could not find free time. Opening default.");
                            onResult({ title, start, end, description: meta.join('\n'), location: locationType, attendees: resolvedAttendees, isUpdate });
                        }
                    })
                    .catch(err => {
                        console.error("Smart schedule failed", err);
                        onResult({ title, start, end, description: meta.join('\n'), location: locationType, attendees: resolvedAttendees, isUpdate });
                    });
                return;
            }

            // Normal Return
            onResult({
                title: title,
                start: start,
                end: end,
                description: meta.length > 0 ? meta.join('\n') : undefined,
                location: locationType,
                attendees: resolvedAttendees,
                isUpdate
            });

        } catch (err) {
            console.error("Parsing error:", err);
            setError("Could not auto-process. Please try again.");
        }
    }, [onResult, contacts]);

    useEffect(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setError("Browser does not support voice input.");
            return;
        }
    }, []);

    const toggleListening = () => {
        if (listening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const startListening = () => {
        setError('');
        setTranscript('');
        setListening(true);

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setListening(true);
        };

        recognition.onresult = (event: any) => {
            const current = event.resultIndex;
            const transcriptText = event.results[current][0].transcript;
            setTranscript(transcriptText);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech error", event.error);
            setError("Voice error. Please try again.");
            setListening(false);
        };

        recognition.onend = () => {
            setListening(false);
        };

        recognition.onresult = (event: any) => {
            const current = event.resultIndex;
            const result = event.results[current];
            const text = result[0].transcript;
            setTranscript(text);

            if (result.isFinal) {
                setTimeout(() => {
                    processCommand(text);
                    setListening(false);
                    recognition.stop();
                }, 500);
            }
        };

        recognition.start();
    };

    const stopListening = () => {
        setListening(false);
    };

    return (
        <div className="voice-input-container">
            <div className={`mic-button-wrapper ${listening ? 'listening' : ''}`}>
                <button
                    onClick={toggleListening}
                    className={`mic-button ${listening ? 'active' : ''}`}
                    title={listening ? "Stop listening" : "Start voice command"}
                >
                    {listening ? <Mic className="animate-pulse" /> : <Mic />}
                </button>
                {listening && <div className="ripple"></div>}
            </div>

            <div className="status-text">
                {error ? (
                    <span className="text-error">{error}</span>
                ) : listening ? (
                    <span className="text-active">Listening...</span>
                ) : (
                    <span className="text-idle">Tap mic to speak</span>
                )}
            </div>

            {transcript && (
                <div className="transcript-preview">
                    "{transcript}"
                </div>
            )}

            <style jsx>{`
                .voice-input-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 20px;
                    text-align: center;
                }

                .mic-button-wrapper {
                    position: relative;
                    margin-bottom: 24px;
                }

                .mic-button {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: var(--color-bg-secondary);
                    border: 2px solid var(--color-border);
                    color: var(--color-text-main);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    position: relative;
                    z-index: 10;
                }

                .mic-button:hover {
                    border-color: var(--color-accent);
                    background: var(--color-bg-main);
                    transform: scale(1.05);
                }

                .mic-button.active {
                    background: var(--color-accent);
                    color: white;
                    border-color: var(--color-accent);
                    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
                }

                .ripple {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    background: var(--color-accent);
                    opacity: 0.6;
                    animation: ripple 1.5s infinite linear;
                    z-index: 0;
                }

                @keyframes ripple {
                    0% { width: 80px; height: 80px; opacity: 0.6; }
                    100% { width: 140px; height: 140px; opacity: 0; }
                }

                .status-text {
                    font-size: 1.1rem;
                    font-weight: 500;
                    margin-bottom: 16px;
                    min-height: 1.5em;
                }

                .text-active { color: var(--color-accent); }
                .text-idle { color: var(--color-text-secondary); }
                .text-error { color: var(--color-error); }

                .transcript-preview {
                    font-size: 1.25rem;
                    color: var(--color-text-main);
                    font-weight: 600;
                    max-width: 90%;
                    line-height: 1.4;
                    opacity: 0;
                    animation: slideUp 0.3s forwards;
                }
            `}</style>
        </div>
    );
}
