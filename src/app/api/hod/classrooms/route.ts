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

        const classrooms = await prisma.classroom.findMany({
            where: { departmentId, isDeleted: false },
            include: {
                _count: {
                    select: { students: true, sessions: true },
                },
            },
            orderBy: { name: 'asc' },
        });

        const formattedClassrooms = classrooms.map(c => ({
            id: c.id,
            name: c.name,
            batch: c.batch,
            year: c.year,
            semester: c.semester,
            studentCount: c._count.students,
            sessionCount: c._count.sessions,
            createdAt: c.createdAt,
        }));

        return NextResponse.json({ success: true, data: formattedClassrooms });
    } catch (error) {
        console.error('Error fetching classrooms:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const hod = await prisma.hOD.findFirst({
            where: { user: { id: session.user.id }, isDeleted: false },
            select: { id: true, departmentId: true },
        });

        if (!hod) {
            return NextResponse.json({ error: 'HOD not found' }, { status: 404 });
        }

        const body = await request.json();
        const { name, batch, year, semester } = body;

        if (!name) {
            return NextResponse.json({ error: 'Classroom name is required' }, { status: 400 });
        }

        const classroom = await prisma.classroom.create({
            data: {
                name,
                departmentId: hod.departmentId,
                batch,
                year: year ? parseInt(year) : null,
                semester: semester ? parseInt(semester) : null,
                createdById: session.user.id,
            },
        });

        return NextResponse.json({ success: true, data: classroom }, { status: 201 });
    } catch (error) {
        console.error('Error creating classroom:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
