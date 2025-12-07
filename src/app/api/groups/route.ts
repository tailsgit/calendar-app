import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET - List user's groups
export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get groups where user is a member (approved) or leader
        const memberships = await prisma.groupMember.findMany({
            where: {
                userId: session.user.id,
                status: 'approved',
            },
            include: {
                group: {
                    include: {
                        leader: {
                            select: { id: true, name: true, image: true },
                        },
                        _count: {
                            select: { members: { where: { status: 'approved' } } },
                        },
                    },
                },
            },
        });

        // Also get groups user leads
        const ledGroups = await prisma.group.findMany({
            where: { leaderId: session.user.id },
            include: {
                leader: {
                    select: { id: true, name: true, image: true },
                },
                _count: {
                    select: { members: { where: { status: 'approved' } } },
                },
            },
        });

        // Combine and deduplicate
        const groupIds = new Set(memberships.map(m => m.group.id));
        const allGroups = [
            ...memberships.map(m => m.group),
            ...ledGroups.filter(g => !groupIds.has(g.id)),
        ];

        return NextResponse.json({ groups: allGroups });
    } catch (error) {
        console.error('Error fetching groups:', error);
        return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
    }
}

// POST - Create new group
export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, description } = body;

        if (!name) {
            return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
        }

        // Create group with current user as leader
        const group = await prisma.group.create({
            data: {
                name,
                description,
                leaderId: session.user.id,
                members: {
                    create: {
                        userId: session.user.id,
                        status: 'approved',
                        role: 'leader',
                    },
                },
            },
            include: {
                leader: {
                    select: { id: true, name: true, image: true },
                },
            },
        });

        return NextResponse.json({ group });
    } catch (error) {
        console.error('Error creating group:', error);
        return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
    }
}
