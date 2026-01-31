import { NextRequest, NextResponse } from 'next/server';
import { faculty, subjects, departments, getDepartmentById, getSubjectById } from '@/lib/mock-data';

// GET /api/faculty - Get all faculty
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const departmentId = searchParams.get('departmentId');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let filteredFaculty = [...faculty];

    if (departmentId) {
        filteredFaculty = filteredFaculty.filter(f => f.departmentId === departmentId);
    }

    if (activeOnly) {
        filteredFaculty = filteredFaculty.filter(f => f.isActive);
    }

    // Add department name and subject details to each faculty
    const facultyWithDetails = filteredFaculty.map(fac => ({
        ...fac,
        departmentName: getDepartmentById(fac.departmentId)?.name || 'Unknown',
        subjects: fac.assignedSubjects.map(subId => getSubjectById(subId)).filter(Boolean),
    }));

    return NextResponse.json({
        success: true,
        data: facultyWithDetails,
        total: facultyWithDetails.length,
    });
}

// POST /api/faculty - Add a new faculty member
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { name, email, departmentId, assignedSubjects = [] } = body;

        if (!name || !email || !departmentId) {
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

        const newFaculty = {
            id: `fac-${Date.now()}`,
            name,
            email,
            departmentId,
            assignedSubjects,
            isActive: true,
        };

        return NextResponse.json({
            success: true,
            data: newFaculty,
            message: 'Faculty created successfully',
        }, { status: 201 });
    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid request body' },
            { status: 400 }
        );
    }
}
