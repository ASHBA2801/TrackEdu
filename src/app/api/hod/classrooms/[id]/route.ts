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

// GET single classroom
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

        const { id } = await params;

        const classroom = await prisma.classroom.findFirst({
            where: { id, departmentId, isDeleted: false },
            include: {
                students: {
                    include: {
                        student: {
                            include: {
                                user: { select: { name: true, email: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!classroom) {
            return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: {
                ...classroom,
                students: classroom.students.map(cs => ({
                    id: cs.student.id,
                    name: cs.student.user.name,
                    email: cs.student.user.email,
                    rollNumber: cs.student.rollNumber,
                    year: cs.student.year,
                    section: cs.student.section,
                })),
            },
        });
    } catch (error) {
        console.error('Error fetching classroom:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH update classroom
export async function PATCH(
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

        const { id } = await params;
        const body = await request.json();

        // Verify classroom belongs to HOD's department
        const existing = await prisma.classroom.findFirst({
            where: { id, departmentId, isDeleted: false },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
        }

        const { name, batch, year, semester } = body;

        const classroom = await prisma.classroom.update({
            where: { id },
            data: {
                name: name || existing.name,
                batch,
                year: year !== undefined ? parseInt(year) : existing.year,
                semester: semester !== undefined ? parseInt(semester) : existing.semester,
            },
        });

        return NextResponse.json({ success: true, data: classroom });
    } catch (error) {
        console.error('Error updating classroom:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE soft delete classroom
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

        const { id } = await params;

        // Verify classroom belongs to HOD's department
        const existing = await prisma.classroom.findFirst({
            where: { id, departmentId, isDeleted: false },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
        }

        await prisma.classroom.update({
            where: { id },
            data: { isDeleted: true },
        });

        return NextResponse.json({ success: true, message: 'Classroom deleted' });
    } catch (error) {
        console.error('Error deleting classroom:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
