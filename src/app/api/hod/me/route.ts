import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch HOD with department info
        const hod = await prisma.hOD.findFirst({
            where: {
                user: { id: session.user.id },
                isDeleted: false,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                department: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
        });

        if (!hod) {
            return NextResponse.json({ error: 'HOD profile not found' }, { status: 404 });
        }

        // Get department statistics
        const [studentCount, facultyCount, classroomCount, pendingLeaveCount] = await Promise.all([
            prisma.student.count({
                where: { departmentId: hod.departmentId, isDeleted: false, isActive: true },
            }),
            prisma.faculty.count({
                where: { departmentId: hod.departmentId, isDeleted: false, isActive: true },
            }),
            prisma.classroom.count({
                where: { departmentId: hod.departmentId, isDeleted: false },
            }),
            prisma.leaveRequest.count({
                where: { departmentId: hod.departmentId, status: 'PENDING' },
            }),
        ]);

        return NextResponse.json({
            success: true,
            data: {
                id: hod.id,
                name: hod.user.name,
                email: hod.user.email,
                departmentId: hod.departmentId,
                departmentName: hod.department.name,
                departmentCode: hod.department.code,
                isActive: hod.isActive,
                stats: {
                    students: studentCount,
                    faculty: facultyCount,
                    classrooms: classroomCount,
                    pendingLeaves: pendingLeaveCount,
                },
            },
        });
    } catch (error) {
        console.error('Error fetching HOD profile:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
