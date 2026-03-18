import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Helper to get HOD's department
async function getHodDepartmentId(userId: string): Promise<string | null> {
    const hod = await prisma.hOD.findFirst({
        where: { user: { id: userId }, isDeleted: false },
        select: { departmentId: true },
    });
    return hod?.departmentId || null;
}

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const departmentId = await getHodDepartmentId(session.user.id);
        if (!departmentId) {
            return NextResponse.json({ error: 'HOD not found' }, { status: 404 });
        }

        const searchParams = request.nextUrl.searchParams;
        const classroomId = searchParams.get('classroomId');
        const subjectId = searchParams.get('subjectId');
        const facultyId = searchParams.get('facultyId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Build where clause for sessions within department
        const sessionWhere: { 
            subject: { departmentId: string }; 
            classroomId?: string; 
            subjectId?: string; 
            facultyId?: string; 
            startTime?: { gte?: Date; lte?: Date }; 
        } = {
            subject: { departmentId },
        };

        if (classroomId) sessionWhere.classroomId = classroomId;
        if (subjectId) sessionWhere.subjectId = subjectId;
        if (facultyId) sessionWhere.facultyId = facultyId;
        if (startDate || endDate) {
            sessionWhere.startTime = {};
            if (startDate) sessionWhere.startTime.gte = new Date(startDate);
            if (endDate) sessionWhere.startTime.lte = new Date(endDate + 'T23:59:59');
        }

        // Fetch sessions with attendance
        const sessions = await prisma.classSession.findMany({
            where: sessionWhere,
            include: {
                subject: { select: { id: true, name: true, code: true } },
                faculty: {
                    include: {
                        user: { select: { name: true } },
                    },
                },
                classroom: { select: { id: true, name: true } },
                attendance: {
                    include: {
                        student: {
                            include: {
                                user: { select: { name: true } },
                            },
                        },
                    },
                },
            },
            orderBy: { startTime: 'desc' },
            take: 100,
        });

        // Format response
        const formattedSessions = sessions.map(session => ({
            id: session.id,
            date: session.startTime,
            subject: session.subject,
            faculty: {
                id: session.faculty.id,
                name: session.faculty.user.name,
            },
            classroom: session.classroom,
            status: session.status,
            attendanceSummary: {
                total: session.attendance.length,
                present: session.attendance.filter(a => a.status === 'PRESENT').length,
                absent: session.attendance.filter(a => a.status === 'ABSENT').length,
                leave: session.attendance.filter(a => a.status === 'LEAVE').length,
            },
            attendance: session.attendance.map(a => ({
                studentId: a.studentId,
                studentName: a.student.user.name,
                rollNumber: a.student.rollNumber,
                status: a.status,
            })),
        }));

        return NextResponse.json({ success: true, data: formattedSessions });
    } catch (error) {
        console.error('Error fetching attendance:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
