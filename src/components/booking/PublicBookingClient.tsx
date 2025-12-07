
"use client";

import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfDay, isSameDay } from 'date-fns';
import MonthView from '@/components/calendar/MonthView'; // Reusing existing component
import toast from 'react-hot-toast';
import { Loader2, ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, CheckCircle } from 'lucide-react';

interface BookingPageData {
    id: string;
    title: string;
    description: string | null;
    duration: number;
    slug: string;
    owner: {
        name: string | null;
        image: string | null;
        timeZone: string;
    };
}

export default function PublicBookingClient({ page }: { page: BookingPageData }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [slots, setSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [bookingStep, setBookingStep] = useState<'date' | 'form' | 'success'>('date');

    // Form State
    const [formData, setFormData] = useState({ name: '', email: '', notes: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (selectedDate) {
            fetchSlots(selectedDate);
            setSelectedSlot(null);
        }
    }, [selectedDate]);

    const fetchSlots = async (date: Date) => {
        setLoadingSlots(true);
        try {
            // Fetch for the whole day (00:00 to 23:59) in UTC or just pass simplified range
            // The API expects start/end ISO strings.
            const start = startOfDay(date);
            const end = new Date(start);
            end.setHours(23, 59, 59);

            const res = await fetch(`/api/booking/${page.slug}/slots?start=${start.toISOString()}&end=${end.toISOString()}`);
            if (res.ok) {
                const data = await res.json();
                setSlots(data);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load slots');
        } finally {
            setLoadingSlots(false);
        }
    };

    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSlot) return;

        setSubmitting(true);
        try {
            const res = await fetch(`/api/booking/${page.slug}/book`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    startTime: selectedSlot
                })
            });

            if (res.ok) {
                setBookingStep('success');
            } else {
                toast.error('Failed to book appointment');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error submitting booking');
        } finally {
            setSubmitting(false);
        }
    };

    if (bookingStep === 'success') {
        return (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-neutral-800">Booking Confirmed!</h2>
                <p className="text-neutral-600">
                    You are scheduled with {page.owner.name} for {format(new Date(selectedSlot!), 'EEEE, MMMM do')} at {format(new Date(selectedSlot!), 'h:mm a')}.
                </p>
                <p className="text-sm text-neutral-500">A calendar invitation has been sent to your email.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row h-full min-h-[600px]">
            {/* Sidebar Info */}
            <div className="w-full md:w-1/3 p-8 border-b md:border-b-0 md:border-r border-neutral-100 bg-neutral-50/50">
                <div className="mb-6">
                    {page.owner.image && (
                        <img src={page.owner.image} alt={page.owner.name || ''} className="w-12 h-12 rounded-full mb-4" />
                    )}
                    <p className="text-neutral-500 text-sm font-medium uppercase tracking-wider mb-1">{page.owner.name}</p>
                    <h1 className="text-3xl font-bold text-neutral-900 mb-4">{page.title}</h1>
                    <div className="flex items-center text-neutral-600 space-x-2 mb-2">
                        <Clock size={16} />
                        <span>{page.duration} mins</span>
                    </div>
                    {page.description && (
                        <p className="text-neutral-600 mt-4 leading-relaxed text-sm">{page.description}</p>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 bg-white relative">
                {bookingStep === 'date' ? (
                    <div className="flex flex-col h-full">
                        <h2 className="text-xl font-semibold mb-6">Select a Date & Time</h2>

                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Calendar */}
                            <div className="flex-1 border rounded-xl p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <h3 className="font-medium text-lg">{format(currentDate, 'MMMM yyyy')}</h3>
                                    <div className="flex space-x-1">
                                        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 hover:bg-neutral-100 rounded">
                                            <ChevronLeft size={20} />
                                        </button>
                                        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 hover:bg-neutral-100 rounded">
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                </div>
                                <div className="customer-calendar-wrapper">
                                    <MonthView
                                        currentDate={currentDate}
                                        events={[]} // No events shown to public
                                        onDateClick={(date) => {
                                            // Only allow future dates
                                            if (startOfDay(date) >= startOfDay(new Date())) {
                                                setSelectedDate(date);
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Slots */}
                            <div className="w-full lg:w-64 flex-shrink-0">
                                {selectedDate ? (
                                    <div className="h-full flex flex-col">
                                        <h3 className="font-medium mb-4 text-neutral-900">
                                            {format(selectedDate, 'EEEE, MMM d')}
                                        </h3>

                                        {loadingSlots ? (
                                            <div className="flex items-center justify-center py-12">
                                                <Loader2 className="animate-spin text-neutral-400" />
                                            </div>
                                        ) : slots.length > 0 ? (
                                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                {slots.map(slot => (
                                                    <button
                                                        key={slot}
                                                        onClick={() => {
                                                            setSelectedSlot(slot);
                                                            setBookingStep('form');
                                                        }}
                                                        className="w-full py-3 px-4 text-center border border-primary text-primary font-medium rounded-lg hover:bg-primary hover:text-white transition-all focus:ring-2 focus:ring-primary focus:ring-offset-1"
                                                    >
                                                        {format(new Date(slot), 'h:mm a')}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-neutral-500 bg-neutral-50 p-4 rounded-lg">
                                                No availability on this day.
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-neutral-400 text-sm bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                                        Select a date to view times
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-md mx-auto pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <button
                            onClick={() => {
                                setBookingStep('date');
                                setSelectedSlot(null);
                            }}
                            className="text-sm text-neutral-500 hover:text-neutral-800 flex items-center mb-6"
                        >
                            <ChevronLeft size={16} className="mr-1" /> Back to Calendar
                        </button>

                        <h2 className="text-xl font-bold mb-2">Enter Details</h2>
                        <p className="text-neutral-500 text-sm mb-6">
                            {format(new Date(selectedSlot!), 'EEEE, MMMM do')} at {format(new Date(selectedSlot!), 'h:mm a')}
                        </p>

                        <form onSubmit={handleBook} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Name *</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Email *</label>
                                <input
                                    required
                                    type="email"
                                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Notes</label>
                                <textarea
                                    rows={3}
                                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed mt-4 transition-colors"
                            >
                                {submitting ? (
                                    <span className="flex items-center justify-center">
                                        <Loader2 size={18} className="animate-spin mr-2" /> Booking...
                                    </span>
                                ) : 'Schedule Event'}
                            </button>
                        </form>
                    </div>
                )}
            </div>

            <style jsx global>{`
                .customer-calendar-wrapper .month-view {
                    border: none;
                    background: transparent;
                }
                .customer-calendar-wrapper .month-header {
                    background: transparent;
                    border-bottom: none;
                }
                .customer-calendar-wrapper .day-cell {
                    border: none;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 2px auto;
                }
                .customer-calendar-wrapper .day-cell:hover {
                    background-color: var(--color-bg-secondary);
                    color: var(--color-primary);
                }
                .customer-calendar-wrapper .day-cell.today .date-number {
                    background: transparent;
                    color: inherit;
                    font-weight: bold;
                }
                /* Selected State Hack since reusing component */
                /* Ideally would pass selected prop to MonthView but for speed using CSS/Parents */
                
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: var(--color-border);
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
}
