import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Helper to get HOD info
async function getHodInfo(userId: string) {
    return prisma.hOD.findFirst({
        where: { user: { id: userId }, isDeleted: false },
        select: { id: true, departmentId: true },
    });
}

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const hod = await getHodInfo(session.user.id);
        if (!hod) {
            return NextResponse.json({ error: 'HOD not found' }, { status: 404 });
        }

        const notifications = await prisma.notification.findMany({
            where: { hodId: hod.id },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                leaveRequest: {
                    include: {
                        student: {
                            include: { user: { select: { name: true } } },
                        },
                    },
                },
            },
        });

        const unreadCount = await prisma.notification.count({
            where: { hodId: hod.id, isRead: false },
        });

        const formatted = notifications.map(n => ({
            id: n.id,
            type: n.type,
            message: n.message,
            isRead: n.isRead,
            createdAt: n.createdAt,
            leaveRequest: n.leaveRequest ? {
                id: n.leaveRequest.id,
                studentName: n.leaveRequest.student.user.name,
                leaveDate: n.leaveRequest.leaveDate,
                status: n.leaveRequest.status,
            } : null,
        }));

        return NextResponse.json({
            success: true,
            data: {
                unreadCount,
                notifications: formatted,
            },
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH - mark notifications as read
export async function PATCH(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const hod = await getHodInfo(session.user.id);
        if (!hod) {
            return NextResponse.json({ error: 'HOD not found' }, { status: 404 });
        }

        const body = await request.json();
        const { notificationIds, markAllRead } = body;

        if (markAllRead) {
            await prisma.notification.updateMany({
                where: { hodId: hod.id, isRead: false },
                data: { isRead: true },
            });
        } else if (notificationIds && Array.isArray(notificationIds)) {
            await prisma.notification.updateMany({
                where: { id: { in: notificationIds }, hodId: hod.id },
                data: { isRead: true },
            });
        }

        return NextResponse.json({ success: true, message: 'Notifications updated' });
    } catch (error) {
        console.error('Error updating notifications:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
