import { NextRequest, NextResponse } from 'next/server';
import { departments } from '@/lib/mock-data';

// GET /api/departments - Get all departments
export async function GET() {
    return NextResponse.json({
        success: true,
        data: departments,
        total: departments.length,
    });
}

// POST /api/departments - Create a new department
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { name, code } = body;

        if (!name || !code) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const newDepartment = {
            id: `dept-${Date.now()}`,
            name,
            code,
        };

        return NextResponse.json({
            success: true,
            data: newDepartment,
            message: 'Department created successfully',
        }, { status: 201 });
    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid request body' },
            { status: 400 }
        );
    }
}
