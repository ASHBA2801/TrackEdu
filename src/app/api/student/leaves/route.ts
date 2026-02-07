import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET student's leave requests
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const student = await prisma.student.findFirst({
            where: { user: { id: session.user.id }, isDeleted: false },
        });

        if (!student) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        const leaveRequests = await prisma.leaveRequest.findMany({
            where: { studentId: student.id },
            include: {
                reviewedBy: {
                    include: { user: { select: { name: true } } },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const formatted = leaveRequests.map(lr => ({
            id: lr.id,
            leaveDate: lr.leaveDate,
            reason: lr.reason,
            status: lr.status,
            createdAt: lr.createdAt,
            reviewedAt: lr.reviewedAt,
            reviewedBy: lr.reviewedBy?.user.name,
        }));

        return NextResponse.json({ success: true, data: formatted });
    } catch (error) {
        console.error('Error fetching leave requests:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST submit new leave request
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const student = await prisma.student.findFirst({
            where: { user: { id: session.user.id }, isDeleted: false },
            include: { department: true },
        });

        if (!student) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        const body = await request.json();
        const { leaveDate, reason } = body;

        if (!leaveDate || !reason) {
            return NextResponse.json({ error: 'leaveDate and reason are required' }, { status: 400 });
        }

        const leaveDateObj = new Date(leaveDate);
        if (leaveDateObj < new Date(new Date().setHours(0, 0, 0, 0))) {
            return NextResponse.json({ error: 'Cannot request leave for past dates' }, { status: 400 });
        }

        // Check for duplicate request
        const existing = await prisma.leaveRequest.findFirst({
            where: {
                studentId: student.id,
                leaveDate: leaveDateObj,
                status: { in: ['PENDING', 'APPROVED'] },
            },
        });

        if (existing) {
            return NextResponse.json({ error: 'Leave request already exists for this date' }, { status: 400 });
        }

        // Create leave request
        const leaveRequest = await prisma.leaveRequest.create({
            data: {
                studentId: student.id,
                departmentId: student.departmentId,
                leaveDate: leaveDateObj,
                reason,
            },
        });

        // Create notification for department HODs
        const departmentHods = await prisma.hOD.findMany({
            where: { departmentId: student.departmentId, isDeleted: false },
        });

        if (departmentHods.length > 0) {
            await prisma.notification.createMany({
                data: departmentHods.map(hod => ({
                    hodId: hod.id,
                    type: 'LEAVE_REQUEST',
                    message: `New leave request from ${session.user?.name || 'a student'} for ${leaveDateObj.toLocaleDateString()}`,
                    leaveRequestId: leaveRequest.id,
                })),
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Leave request submitted',
            data: {
                id: leaveRequest.id,
                leaveDate: leaveRequest.leaveDate,
                status: leaveRequest.status,
            },
        }, { status: 201 });
    } catch (error) {
        console.error('Error submitting leave request:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
