import { NextRequest, NextResponse } from 'next/server';
import { subjects, getDepartmentById } from '@/lib/mock-data';

// GET /api/subjects - Get all subjects
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const departmentId = searchParams.get('departmentId');
    const semester = searchParams.get('semester');

    let filteredSubjects = [...subjects];

    if (departmentId) {
        filteredSubjects = filteredSubjects.filter(s => s.departmentId === departmentId);
    }

    if (semester) {
        filteredSubjects = filteredSubjects.filter(s => s.semester === parseInt(semester));
    }

    const subjectsWithDept = filteredSubjects.map(subject => ({
        ...subject,
        departmentName: getDepartmentById(subject.departmentId)?.name || 'Unknown',
    }));

    return NextResponse.json({
        success: true,
        data: subjectsWithDept,
        total: subjectsWithDept.length,
    });
}

// POST /api/subjects - Create a new subject
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { name, code, departmentId, semester, credits } = body;

        if (!name || !code || !departmentId || !semester || !credits) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const department = getDepartmentById(departmentId);
        if (!department) {
            return NextResponse.json(
                { success: false, error: 'Invalid department' },
                { status: 400 }
            );
        }

        const newSubject = {
            id: `sub-${Date.now()}`,
            name,
            code,
            departmentId,
            semester,
            credits,
        };

        return NextResponse.json({
            success: true,
            data: newSubject,
            message: 'Subject created successfully',
        }, { status: 201 });
    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid request body' },
            { status: 400 }
        );
    }
}
