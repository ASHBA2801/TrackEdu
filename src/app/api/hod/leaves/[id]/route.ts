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

// PATCH - approve or reject leave
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const hod = await getHodInfo(session.user.id);
        if (!hod) {
            return NextResponse.json({ error: 'HOD not found' }, { status: 404 });
        }

        const { id } = await params;
        const body = await request.json();
        const { status } = body;

        if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
            return NextResponse.json({ error: 'Status must be APPROVED or REJECTED' }, { status: 400 });
        }

        // Verify leave request belongs to HOD's department
        const leaveRequest = await prisma.leaveRequest.findFirst({
            where: { id, departmentId: hod.departmentId },
        });

        if (!leaveRequest) {
            return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
        }

        if (leaveRequest.status !== 'PENDING') {
            return NextResponse.json({ error: 'Leave request already processed' }, { status: 400 });
        }

        const updated = await prisma.leaveRequest.update({
            where: { id },
            data: {
                status,
                reviewedById: hod.id,
                reviewedAt: new Date(),
            },
            include: {
                student: {
                    include: { user: { select: { name: true } } },
                },
            },
        });

        // If approved, mark student as LEAVE for that date in any existing attendance records
        if (status === 'APPROVED') {
            await prisma.attendance.updateMany({
                where: {
                    studentId: leaveRequest.studentId,
                    date: leaveRequest.leaveDate,
                },
                data: { status: 'LEAVE' },
            });
        }

        return NextResponse.json({
            success: true,
            message: `Leave request ${status.toLowerCase()}`,
            data: {
                id: updated.id,
                status: updated.status,
                studentName: updated.student.user.name,
                leaveDate: updated.leaveDate,
            },
        });
    } catch (error) {
        console.error('Error updating leave request:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
