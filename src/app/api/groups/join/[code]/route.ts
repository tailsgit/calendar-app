import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

// POST - Request to join group via invite code
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const session = await auth();
        const { code } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Find group by invite code
        const group = await prisma.group.findUnique({
            where: { inviteCode: code },
            include: { leader: true },
        });

        if (!group) {
            return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
        }

        // Check if already a member
        const existingMembership = await prisma.groupMember.findUnique({
            where: {
                userId_groupId: {
                    userId: session.user.id,
                    groupId: group.id,
                },
            },
        });

        if (existingMembership) {
            if (existingMembership.status === 'approved') {
                return NextResponse.json({ error: 'Already a member of this group' }, { status: 400 });
            }
            if (existingMembership.status === 'pending') {
                return NextResponse.json({ error: 'Request already pending' }, { status: 400 });
            }
            // If rejected, allow re-request
        }

        // Create pending membership
        const membership = await prisma.groupMember.upsert({
            where: {
                userId_groupId: {
                    userId: session.user.id,
                    groupId: group.id,
                },
            },
            update: { status: 'pending' },
            create: {
                userId: session.user.id,
                groupId: group.id,
                status: 'pending',
                role: 'member',
            },
        });

        // Notify the group leader
        await createNotification({
            userId: group.leaderId,
            type: 'booking',
            title: '👋 New Join Request',
            message: `${session.user.name || 'Someone'} wants to join "${group.name}"`,
            link: `/groups/${group.id}`,
        });

        return NextResponse.json({
            success: true,
            message: 'Join request sent! Waiting for leader approval.',
            groupName: group.name,
        });
    } catch (error) {
        console.error('Error joining group:', error);
        return NextResponse.json({ error: 'Failed to join group' }, { status: 500 });
    }
}

// GET - Get group info from invite code (public)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params;

        const group = await prisma.group.findUnique({
            where: { inviteCode: code },
            select: {
                id: true,
                name: true,
                description: true,
                leader: {
                    select: { name: true, image: true },
                },
                _count: {
                    select: { members: { where: { status: 'approved' } } },
                },
            },
        });

        if (!group) {
            return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
        }

        return NextResponse.json({ group });
    } catch (error) {
        console.error('Error fetching group:', error);
        return NextResponse.json({ error: 'Failed to fetch group info' }, { status: 500 });
    }
}
