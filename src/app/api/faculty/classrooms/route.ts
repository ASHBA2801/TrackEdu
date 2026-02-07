import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const departmentId = searchParams.get('departmentId');

        if (!departmentId) {
            return NextResponse.json({ error: 'departmentId is required' }, { status: 400 });
        }

        // Verify faculty belongs to this department
        const faculty = await prisma.faculty.findFirst({
            where: { user: { id: session.user.id }, isDeleted: false },
        });

        if (!faculty) {
            return NextResponse.json({ error: 'Faculty not found' }, { status: 404 });
        }

        // Get classrooms for the department with student count
        const classrooms = await prisma.classroom.findMany({
            where: { departmentId, isDeleted: false },
            include: {
                _count: { select: { students: true } },
            },
            orderBy: { name: 'asc' },
        });

        const formatted = classrooms.map(c => ({
            id: c.id,
            name: c.name,
            batch: c.batch,
            year: c.year,
            semester: c.semester,
            studentCount: c._count.students,
        }));

        return NextResponse.json({ success: true, data: formatted });
    } catch (error) {
        console.error('Error fetching classrooms:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
