import prisma from '@/lib/prisma';

interface CreateNotificationData {
    userId: string;
    type: 'booking' | 'reminder' | 'update' | 'cancelled';
    title: string;
    message: string;
    link?: string;
}

export async function createNotification(data: CreateNotificationData) {
    try {
        const notification = await prisma.notification.create({
            data: {
                userId: data.userId,
                type: data.type,
                title: data.title,
                message: data.message,
                link: data.link,
            },
        });
        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
}

export async function notifyNewBooking(data: {
    hostId: string;
    guestName: string;
    meetingTitle: string;
    date: string;
    time: string;
}) {
    return createNotification({
        userId: data.hostId,
        type: 'booking',
        title: 'New Booking',
        message: `${data.guestName} booked "${data.meetingTitle}" on ${data.date} at ${data.time}`,
        link: '/',
    });
}

export async function notifyMeetingReminder(data: {
    userId: string;
    meetingTitle: string;
    startTime: string;
}) {
    return createNotification({
        userId: data.userId,
        type: 'reminder',
        title: 'Meeting Reminder',
        message: `"${data.meetingTitle}" starts at ${data.startTime}`,
        link: '/',
    });
}

export async function notifyMeetingUpdate(data: {
    userId: string;
    meetingTitle: string;
    change: string;
}) {
    return createNotification({
        userId: data.userId,
        type: 'update',
        title: 'Meeting Updated',
        message: `"${data.meetingTitle}" has been updated: ${data.change}`,
        link: '/',
    });
}

export async function notifyMeetingCancelled(data: {
    userId: string;
    meetingTitle: string;
    cancelledBy: string;
}) {
    return createNotification({
        userId: data.userId,
        type: 'cancelled',
        title: 'Meeting Cancelled',
        message: `"${data.meetingTitle}" was cancelled by ${data.cancelledBy}`,
        link: '/',
    });
}
