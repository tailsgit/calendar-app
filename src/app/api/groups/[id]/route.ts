import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET - Get group details with members
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
                leader: {
                    select: { id: true, name: true, email: true, image: true },
                },
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

        // Check if user is a member
        const isMember = group.members.some(
            m => m.userId === session.user?.id && m.status === 'approved'
        );
        const isLeader = group.leaderId === session.user.id;

        if (!isMember && !isLeader) {
            return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
        }

        return NextResponse.json({ group, isLeader });
    } catch (error) {
        console.error('Error fetching group:', error);
        return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 });
    }
}

// PUT - Update group (leader only)
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
            return NextResponse.json({ error: 'Only the leader can update the group' }, { status: 403 });
        }

        const body = await request.json();
        const { name, description } = body;

        const updatedGroup = await prisma.group.update({
            where: { id },
            data: { name, description },
        });

        return NextResponse.json({ group: updatedGroup });
    } catch (error) {
        console.error('Error updating group:', error);
        return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
    }
}
