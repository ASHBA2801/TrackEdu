import { NextRequest, NextResponse } from 'next/server';
import { students, departments, getDepartmentById } from '@/lib/mock-data';

// GET /api/students - Get all students
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const departmentId = searchParams.get('departmentId');
    const year = searchParams.get('year');
    const section = searchParams.get('section');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let filteredStudents = [...students];

    if (departmentId) {
        filteredStudents = filteredStudents.filter(s => s.departmentId === departmentId);
    }

    if (year) {
        filteredStudents = filteredStudents.filter(s => s.year === parseInt(year));
    }

    if (section) {
        filteredStudents = filteredStudents.filter(s => s.section === section);
    }

    if (activeOnly) {
        filteredStudents = filteredStudents.filter(s => s.isActive);
    }

    // Add department name to each student
    const studentsWithDept = filteredStudents.map(student => ({
        ...student,
        departmentName: getDepartmentById(student.departmentId)?.name || 'Unknown',
    }));

    return NextResponse.json({
        success: true,
        data: studentsWithDept,
        total: studentsWithDept.length,
    });
}

// POST /api/students - Add a new student
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        const { name, email, rollNumber, departmentId, year, section } = body;

        if (!name || !email || !rollNumber || !departmentId || !year || !section) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Check if department exists
        const department = getDepartmentById(departmentId);
        if (!department) {
            return NextResponse.json(
                { success: false, error: 'Invalid department' },
                { status: 400 }
            );
        }

        // Mock creating a new student (in real app, this would save to DB)
        const newStudent = {
            id: `stu-${Date.now()}`,
            name,
            email,
            rollNumber,
            departmentId,
            year,
            section,
            isActive: true,
        };

        return NextResponse.json({
            success: true,
            data: newStudent,
            message: 'Student created successfully',
        }, { status: 201 });
    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid request body' },
            { status: 400 }
        );
    }
}
