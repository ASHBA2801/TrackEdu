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

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const hod = await getHodInfo(session.user.id);
        if (!hod) {
            return NextResponse.json({ error: 'HOD not found' }, { status: 404 });
        }

        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status');

        const where: any = { departmentId: hod.departmentId };
        if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
            where.status = status;
        }

        const leaveRequests = await prisma.leaveRequest.findMany({
            where,
            include: {
                student: {
                    include: {
                        user: { select: { name: true, email: true } },
                    },
                },
                reviewedBy: {
                    include: {
                        user: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const formatted = leaveRequests.map(lr => ({
            id: lr.id,
            studentId: lr.studentId,
            studentName: lr.student.user.name,
            studentEmail: lr.student.user.email,
            rollNumber: lr.student.rollNumber,
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
