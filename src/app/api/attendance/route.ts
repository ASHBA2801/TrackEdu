import { NextRequest, NextResponse } from 'next/server';
import {
    attendance,
    students,
    subjects,
    getStudentById,
    getSubjectById,
    calculateAttendancePercentage
} from '@/lib/mock-data';

// GET /api/attendance - Get attendance records
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');
    const subjectId = searchParams.get('subjectId');
    const date = searchParams.get('date');
    const summary = searchParams.get('summary') === 'true';

    let records = [...attendance];

    if (studentId) {
        records = records.filter(a => a.studentId === studentId);
    }

    if (subjectId) {
        records = records.filter(a => a.subjectId === subjectId);
    }

    if (date) {
        records = records.filter(a => a.date === date);
    }

    // If summary is requested, return aggregated data
    if (summary && studentId) {
        const studentSubjects = [...new Set(records.map(r => r.subjectId))];
        const summaryData = studentSubjects.map(subId => {
            const subject = getSubjectById(subId);
            const subjectRecords = records.filter(r => r.subjectId === subId);
            const attended = subjectRecords.filter(r => r.status === 'present').length;
            const total = subjectRecords.length;

            return {
                subjectId: subId,
                subjectName: subject?.name || 'Unknown',
                subjectCode: subject?.code || '',
                totalClasses: total,
                attended,
                percentage: total > 0 ? Math.round((attended / total) * 100) : 0,
            };
        });

        const overallAttended = records.filter(r => r.status === 'present').length;
        const overallTotal = records.length;

        return NextResponse.json({
            success: true,
            data: {
                subjects: summaryData,
                overall: {
                    totalClasses: overallTotal,
                    attended: overallAttended,
                    percentage: overallTotal > 0 ? Math.round((overallAttended / overallTotal) * 100) : 0,
                },
            },
        });
    }

    // Add student and subject details to records
    const recordsWithDetails = records.map(record => ({
        ...record,
        studentName: getStudentById(record.studentId)?.name || 'Unknown',
        subjectName: getSubjectById(record.subjectId)?.name || 'Unknown',
    }));

    return NextResponse.json({
        success: true,
        data: recordsWithDetails,
        total: recordsWithDetails.length,
    });
}

// POST /api/attendance - Submit attendance
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { subjectId, date, records, markedBy } = body;

        if (!subjectId || !date || !records || !Array.isArray(records) || !markedBy) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Validate subject exists
        const subject = getSubjectById(subjectId);
        if (!subject) {
            return NextResponse.json(
                { success: false, error: 'Invalid subject' },
                { status: 400 }
            );
        }

        // Mock saving attendance records
        const savedRecords = records.map((record: { studentId: string; status: 'present' | 'absent' }) => ({
            id: `att-${Date.now()}-${record.studentId}`,
            studentId: record.studentId,
            subjectId,
            date,
            status: record.status,
            markedBy,
        }));

        return NextResponse.json({
            success: true,
            data: savedRecords,
            message: `Attendance marked for ${savedRecords.length} students`,
        }, { status: 201 });
    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid request body' },
            { status: 400 }
        );
    }
}
