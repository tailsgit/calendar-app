import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET single event
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const event = await prisma.event.findUnique({
            where: { id },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                                title: true,
                                department: true
                            }
                        }
                    }
                },
                owner: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        title: true,
                        department: true
                    }
                }
            },
        });

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        return NextResponse.json(event);
    } catch (error) {
        console.error('Error fetching event:', error);
        return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
    }
}

// UPDATE event
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { title, description, startTime, endTime, locationType, recurrence, attendees } = body;

        // Prepare update data
        const updateData: any = {
            title,
            description,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            locationType,
            recurrence,
        };

        // Handle Participants Update
        if (attendees && Array.isArray(attendees)) {
            // 1. Fetch emails for all provided user IDs
            const users = await prisma.user.findMany({
                where: { id: { in: attendees } },
                select: { id: true, email: true, name: true }
            });

            // Filter users who have emails (required for Participant model)
            const validUsers = users.filter(u => u.email);

            updateData.participants = {
                // Remove participants who are NOT in the new list 
                // (Only for those linked to a user, to avoid deleting external invites if we supported them, though here we assume all are users)
                deleteMany: {
                    userId: { notIn: attendees }
                },
                // Add or Keep existing
                upsert: validUsers.map(user => ({
                    where: {
                        eventId_email: {
                            eventId: id,
                            email: user.email! // Safe assertion
                        }
                    },
                    update: {}, // Do nothing if exists (preserve status)
                    create: {
                        userId: user.id,
                        email: user.email!,
                        name: user.name,
                        status: 'PENDING'
                    }
                }))
            };
        }

        const event = await prisma.event.update({
            where: { id },
            data: updateData,
            include: { // Return participants to update UI immediately
                participants: {
                    include: { user: true }
                }
            }
        });

        return NextResponse.json(event);
    } catch (error) {
        console.error('Error updating event:', error);
        return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }
}

// DELETE event
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Delete participants first
        await prisma.participant.deleteMany({
            where: { eventId: id },
        });

        // Then delete the event
        await prisma.event.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting event:', error);
        return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }
}
