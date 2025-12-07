import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET - Search users within the same group(s)
export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || '';
        const groupId = searchParams.get('groupId');

        if (!query && !groupId) {
            return NextResponse.json({ users: [] });
        }

        // Get user's approved group memberships
        const userMemberships = await prisma.groupMember.findMany({
            where: {
                userId: session.user.id,
                status: 'approved',
            },
            select: { groupId: true },
        });

        const userGroupIds = userMemberships.map(m => m.groupId);

        // Also include groups user leads
        const ledGroups = await prisma.group.findMany({
            where: { leaderId: session.user.id },
            select: { id: true },
        });

        const allGroupIds = [...new Set([...userGroupIds, ...ledGroups.map(g => g.id)])];

        if (allGroupIds.length === 0) {
            return NextResponse.json({ users: [] });
        }

        // Search for users in those groups
        const searchableGroupIds = groupId
            ? (allGroupIds.includes(groupId) ? [groupId] : [])
            : allGroupIds;

        if (searchableGroupIds.length === 0) {
            return NextResponse.json({ users: [], error: 'Not a member of that group' });
        }

        const members = await prisma.groupMember.findMany({
            where: {
                groupId: { in: searchableGroupIds },
                status: 'approved',
                userId: { not: session.user.id }, // Exclude self
                user: query ? {
                    OR: [
                        { name: { contains: query } },
                        { email: { contains: query } },
                        { department: { contains: query } },
                        { title: { contains: query } },
                    ],
                } : undefined,
            },
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
                        timeZone: true,
                    },
                },
                group: {
                    select: { id: true, name: true },
                },
            },
            take: 20,
        });

        // Deduplicate users (in case they're in multiple groups)
        const uniqueUsers = Object.values(
            members.reduce((acc, m) => {
                if (!acc[m.userId]) {
                    acc[m.userId] = {
                        ...m.user,
                        groups: [m.group],
                    };
                } else {
                    acc[m.userId].groups.push(m.group);
                }
                return acc;
            }, {} as Record<string, typeof members[0]['user'] & { groups: typeof members[0]['group'][] }>)
        );

        return NextResponse.json({ users: uniqueUsers });
    } catch (error) {
        console.error('Error searching users:', error);
        return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
    }
}
