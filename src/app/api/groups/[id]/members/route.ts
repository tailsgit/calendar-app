import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

// GET - List group members
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const group = await prisma.group.findUnique({
            where: { id },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                image: true,
                                status: true,
                                department: true,
                                title: true,
                            },
                        },
                    },
                },
            },
        });

        if (!group) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        // Check if user is a member or leader
        const isMember = group.members.some(
            m => m.userId === session.user?.id && m.status === 'approved'
        );
        const isLeader = group.leaderId === session.user.id;

        console.log('Debug Group Members:', {
            groupId: group.id,
            groupLeaderId: group.leaderId,
            currentUserId: session.user.id,
            isLeader,
            isMember
        });

        if (!isMember && !isLeader) {
            return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
        }

        // If leader, return all members. Otherwise, only approved members.
        const members = isLeader
            ? group.members
            : group.members.filter(m => m.status === 'approved');

        return NextResponse.json({ members, isLeader });
    } catch (error) {
        console.error('Error fetching members:', error);
        return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }
}

// PUT - Approve or reject member (leader only)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const group = await prisma.group.findUnique({ where: { id } });

        if (!group) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        if (group.leaderId !== session.user.id) {
            return NextResponse.json({ error: 'Only the leader can manage members' }, { status: 403 });
        }

        const body = await request.json();
        const { memberId, action } = body; // action: 'approve' | 'reject'

        if (!memberId || !['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const membership = await prisma.groupMember.update({
            where: { id: memberId },
            data: { status: action === 'approve' ? 'approved' : 'rejected' },
            include: { user: true, group: true },
        });

        // Notify the user
        await createNotification({
            userId: membership.userId,
            type: action === 'approve' ? 'update' : 'cancelled',
            title: action === 'approve' ? '✅ Group Request Approved' : '❌ Group Request Declined',
            message: action === 'approve'
                ? `You've been approved to join "${group.name}"!`
                : `Your request to join "${group.name}" was declined.`,
            link: action === 'approve' ? '/team' : undefined,
        });

        return NextResponse.json({ membership });
    } catch (error) {
        console.error('Error updating member:', error);
        return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
    }
}
