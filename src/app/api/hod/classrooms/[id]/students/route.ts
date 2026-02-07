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

// GET students in classroom
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const departmentId = await getHodDepartmentId(session.user.id);
        if (!departmentId) {
            return NextResponse.json({ error: 'HOD not found' }, { status: 404 });
        }

        const { id: classroomId } = await params;

        // Verify classroom belongs to department
        const classroom = await prisma.classroom.findFirst({
            where: { id: classroomId, departmentId, isDeleted: false },
        });

        if (!classroom) {
            return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
        }

        const classroomStudents = await prisma.classroomStudent.findMany({
            where: { classroomId },
            include: {
                student: {
                    include: {
                        user: { select: { name: true, email: true } },
                    },
                },
            },
        });

        const students = classroomStudents.map(cs => ({
            id: cs.student.id,
            name: cs.student.user.name,
            email: cs.student.user.email,
            rollNumber: cs.student.rollNumber,
            year: cs.student.year,
            section: cs.student.section,
        }));

        return NextResponse.json({ success: true, data: students });
    } catch (error) {
        console.error('Error fetching classroom students:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST add students to classroom
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const departmentId = await getHodDepartmentId(session.user.id);
        if (!departmentId) {
            return NextResponse.json({ error: 'HOD not found' }, { status: 404 });
        }

        const { id: classroomId } = await params;
        const body = await request.json();
        const { studentIds } = body;

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return NextResponse.json({ error: 'studentIds array is required' }, { status: 400 });
        }

        // Verify classroom belongs to department
        const classroom = await prisma.classroom.findFirst({
            where: { id: classroomId, departmentId, isDeleted: false },
        });

        if (!classroom) {
            return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
        }

        // Verify all students belong to the same department
        const students = await prisma.student.findMany({
            where: { id: { in: studentIds }, departmentId, isDeleted: false },
        });

        if (students.length !== studentIds.length) {
            return NextResponse.json({ error: 'Some students not found or not in department' }, { status: 400 });
        }

        // Add students (skip duplicates)
        const existingEntries = await prisma.classroomStudent.findMany({
            where: { classroomId, studentId: { in: studentIds } },
            select: { studentId: true },
        });

        const existingIds = new Set(existingEntries.map(e => e.studentId));
        const newIds = studentIds.filter((id: string) => !existingIds.has(id));

        if (newIds.length > 0) {
            await prisma.classroomStudent.createMany({
                data: newIds.map((studentId: string) => ({ classroomId, studentId })),
            });
        }

        return NextResponse.json({
            success: true,
            message: `Added ${newIds.length} student(s)`,
            added: newIds.length,
            skipped: studentIds.length - newIds.length,
        });
    } catch (error) {
        console.error('Error adding students:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE remove students from classroom
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const departmentId = await getHodDepartmentId(session.user.id);
        if (!departmentId) {
            return NextResponse.json({ error: 'HOD not found' }, { status: 404 });
        }

        const { id: classroomId } = await params;
        const body = await request.json();
        const { studentIds } = body;

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return NextResponse.json({ error: 'studentIds array is required' }, { status: 400 });
        }

        // Verify classroom belongs to department
        const classroom = await prisma.classroom.findFirst({
            where: { id: classroomId, departmentId, isDeleted: false },
        });

        if (!classroom) {
            return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
        }

        const result = await prisma.classroomStudent.deleteMany({
            where: { classroomId, studentId: { in: studentIds } },
        });

        return NextResponse.json({
            success: true,
            message: `Removed ${result.count} student(s)`,
            removed: result.count,
        });
    } catch (error) {
        console.error('Error removing students:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
