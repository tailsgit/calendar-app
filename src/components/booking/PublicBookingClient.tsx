
"use client";

import { useState, useEffect } from 'react';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    addDays, getDay, isSameMonth, isBefore, isAfter, isToday,
    addMonths, subMonths, startOfDay, isSameDay
} from 'date-fns';
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

    // --- Mini Calendar Logic ---
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const calendarDays = [];
    let day = startDate;
    while (day <= endDate) {
        calendarDays.push(day);
        day = addDays(day, 1);
    }
    const weekBit = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    if (bookingStep === 'success') {
        return (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[500px] animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-3xl font-bold text-neutral-800">Booking Confirmed!</h2>
                <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-100 max-w-md w-full mt-4">
                    <div className="flex items-center justify-center space-x-3 mb-4">
                        {page.owner.image && (
                            <img src={page.owner.image} className="w-10 h-10 rounded-full" />
                        )}
                        <div className="text-left">
                            <p className="text-sm text-neutral-500 font-medium">Scheduled with</p>
                            <p className="font-semibold text-neutral-900">{page.owner.name}</p>
                        </div>
                    </div>
                    <hr className="border-neutral-200 my-4" />
                    <div className="flex items-center text-neutral-700 mb-2">
                        <CalendarIcon size={18} className="mr-3 text-neutral-400" />
                        <span className="font-medium">{format(new Date(selectedSlot!), 'EEEE, MMMM do, yyyy')}</span>
                    </div>
                    <div className="flex items-center text-neutral-700">
                        <Clock size={18} className="mr-3 text-neutral-400" />
                        <span className="font-medium">{format(new Date(selectedSlot!), 'h:mm a')} - {format(new Date(new Date(selectedSlot!).getTime() + page.duration * 60000), 'h:mm a')}</span>
                    </div>
                </div>
                <p className="text-sm text-neutral-400 mt-6">A calendar invitation has been sent to your email.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row h-full min-h-[600px] bg-white rounded-2xl overflow-hidden">
            {/* Sidebar Info - Sticky on Desktop */}
            <div className="w-full md:w-[35%] p-8 border-b md:border-b-0 md:border-r border-neutral-100 bg-neutral-50/50 flex flex-col md:justify-start">
                <div className="sticky top-8">
                    {page.owner.image && (
                        <img src={page.owner.image} alt={page.owner.name || ''} className="w-16 h-16 rounded-full mb-6 shadow-sm" />
                    )}
                    <h1 className="text-2xl font-bold text-neutral-900 mb-2 leading-tight">{page.title}</h1>
                    <div className="flex items-center text-neutral-500 font-medium text-sm mb-6">
                        <span className="mr-2">{page.owner.name}</span>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center text-neutral-600">
                            <Clock size={18} className="mr-3 text-neutral-400" />
                            <span className="font-medium">{page.duration} mins</span>
                        </div>
                        {/* Placeholder for future video/phone details */}
                        <div className="flex items-center text-neutral-600">
                            <div className="w-[18px] mr-3 flex justify-center"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div></div>
                            <span className="font-medium">Video Meeting</span>
                        </div>
                    </div>

                    {page.description && (
                        <p className="text-neutral-500 mt-8 text-sm leading-relaxed">{page.description}</p>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-4 md:p-8 lg:p-12 relative overflow-y-auto">
                <div className="max-w-3xl mx-auto h-full">
                    {bookingStep === 'date' ? (
                        <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-xl font-bold mb-6 text-neutral-900">Select a Date & Time</h2>

                            <div className="flex flex-col lg:flex-row gap-10 h-full">
                                {/* Mini Calendar */}
                                <div className="flex-1 max-w-[400px]">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="font-semibold text-neutral-800 text-lg ml-2">{format(currentDate, 'MMMM yyyy')}</h3>
                                        <div className="flex space-x-2">
                                            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-600">
                                                <ChevronLeft size={20} />
                                            </button>
                                            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-600">
                                                <ChevronRight size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-7 mb-2">
                                        {weekBit.map((d, i) => (
                                            <div key={i} className="text-center text-xs font-semibold text-neutral-400 py-2 uppercase tracking-wide">
                                                {d}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-7 gap-y-2 gap-x-0">
                                        {calendarDays.map((date, idx) => {
                                            const isCurrentMonth = isSameMonth(date, currentDate);
                                            const isPast = isBefore(date, startOfDay(new Date()));
                                            const isSelected = selectedDate && isSameDay(date, selectedDate);
                                            const isTodayDate = isToday(date);

                                            if (!isCurrentMonth) return <div key={idx} />; // Empty cells for clearer look or render gray

                                            return (
                                                <div key={idx} className="flex justify-center">
                                                    <button
                                                        disabled={isPast}
                                                        onClick={() => !isPast && setSelectedDate(date)}
                                                        className={`
                                                        w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200
                                                        ${isSelected
                                                                ? 'bg-neutral-900 text-white shadow-md scale-105'
                                                                : isPast
                                                                    ? 'text-neutral-300 cursor-not-allowed'
                                                                    : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 group-hover:bg-blue-50'
                                                            }
                                                        ${isTodayDate && !isSelected ? 'text-blue-600 font-bold bg-blue-50' : ''}
                                                    `}
                                                    >
                                                        {format(date, 'd')}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Slot List */}
                                <div className="w-full lg:w-64 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-neutral-100 pt-8 lg:pt-0 lg:pl-8">
                                    <h3 className="font-semibold text-neutral-900 mb-4 h-8 flex items-center">
                                        {selectedDate ? format(selectedDate, 'EEEE, MMM d') : 'Select a date'}
                                    </h3>

                                    {selectedDate ? (
                                        loadingSlots ? (
                                            <div className="flex items-center justify-center py-12">
                                                <Loader2 className="animate-spin text-neutral-400" />
                                            </div>
                                        ) : slots.length > 0 ? (
                                            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                                                {slots.map(slot => (
                                                    <button
                                                        key={slot}
                                                        onClick={() => {
                                                            setSelectedSlot(slot);
                                                            setBookingStep('form');
                                                        }}
                                                        className="w-full py-3 px-4 text-center border border-neutral-200 text-neutral-700 font-semibold rounded-lg hover:border-black hover:bg-white hover:shadow-sm active:scale-[0.98] transition-all bg-white"
                                                    >
                                                        {format(new Date(slot), 'h:mm a')}
                                                    </button>
                                                ))}
                                                <div className="h-4" /> {/* Spacer */}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
                                                <p className="text-sm text-neutral-500 font-medium">No avaiability</p>
                                            </div>
                                        )
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-64 text-neutral-400 bg-neutral-50/50 rounded-xl border border-dashed border-neutral-100">
                                            <CalendarIcon size={32} className="mb-2 opacity-20" />
                                            <span className="text-sm">Choose a date to see times</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        // FORM
                        <div className="max-w-md mx-auto pt-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <button
                                onClick={() => {
                                    setBookingStep('date');
                                    setSelectedSlot(null);
                                }}
                                className="text-sm font-semibold text-neutral-500 hover:text-neutral-900 flex items-center mb-8 px-4 py-2 hover:bg-neutral-100 rounded-lg w-max -ml-4 transition-colors"
                            >
                                <ChevronLeft size={16} className="mr-1" /> Back
                            </button>

                            <div className="mb-8">
                                <h2 className="text-2xl font-bold mb-2 text-neutral-900">Enter Details</h2>
                                <p className="text-neutral-500 text-sm flex items-center">
                                    <Clock size={14} className="mr-1.5" />
                                    {format(new Date(selectedSlot!), 'EEEE, MMMM do')} at <strong className="ml-1 text-neutral-800">{format(new Date(selectedSlot!), 'h:mm a')}</strong>
                                </p>
                            </div>

                            <form onSubmit={handleBook} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Full Name *</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="John Doe"
                                        className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Email Address *</label>
                                    <input
                                        required
                                        type="email"
                                        placeholder="john@example.com"
                                        className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Additional Notes</label>
                                    <textarea
                                        rows={4}
                                        placeholder="Please share anything that will help prepare for our meeting."
                                        className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none resize-none transition-all"
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-3.5 bg-neutral-900 text-white font-bold rounded-lg hover:bg-black hover:shadow-lg transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4 transition-all"
                                >
                                    {submitting ? (
                                        <span className="flex items-center justify-center">
                                            <Loader2 size={18} className="animate-spin mr-2" /> confirm Booking...
                                        </span>
                                    ) : 'Schedule Event'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #e5e5e5;
                    border-radius: 20px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: #d4d4d4;
                }
            `}</style>
        </div>
    );
}
