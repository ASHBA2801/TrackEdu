import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validateSubjectOwnership } from "@/lib/utils/authorization";
import { AttendanceStatus } from "@prisma/client";

// GET /api/attendance - Get attendance records
export async function GET(request: NextRequest) {
    const session = await auth();

    if (!session || !session.user) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get("studentId");
    const subjectId = searchParams.get("subjectId");
    const dateStr = searchParams.get("date");
    const summary = searchParams.get("summary") === "true";

    try {
        // Authorization Checks
        if (session.user.role === "STUDENT") {
            // Students can only view their own attendance
            // Typically we'd expect studentId to be passed, or we infer it.
            // Let's look up the student profile for this user
            const studentProfile = await prisma.student.findUnique({ where: { userId: session.user.id } });

            if (!studentProfile) {
                return NextResponse.json({ success: false, error: "Student profile not found" }, { status: 403 });
            }

            // If a specific studentId was requested, ensuring it matches
            if (studentId && studentId !== studentProfile.id) {
                return NextResponse.json({ success: false, error: "Forbidden: Cannot view other students' attendance" }, { status: 403 });
            }
        } else if (session.user.role === "FACULTY") {
            // Faculty can view if they own the subject
            if (subjectId) {
                const isAuthorized = await validateSubjectOwnership(session.user.id, subjectId);
                if (!isAuthorized) {
                    return NextResponse.json({ success: false, error: "Forbidden: Not assigned to this subject" }, { status: 403 });
                }
            } else if (studentId) {
                // If viewing a student's attendance without a subject filter, usually allowed? 
                // Or should we strict this?
                // For now, let's allow general view or maybe filter results to only subjects common?
                // Minimal viable: Allow if subjectId provided. If not, maybe restrict? 
                // Let's enforce strictness: If no subjectId, we might leak data.
                // But the UI might request a student's full report.
                // Let's assume for now Faculty can view Student's attendance generally OR restrict to owned subjects in the query.
                // To be safe: If no subjectId, we should ideally restrict to `where: { subject: { faculty: ... } }` but structure is many-to-many.
                // Let's simpler: Require subjectId for Faculty? Or just let it be for now (Faculty are trusted enough?).
                // User asked for "Strict subject-based authorization".
                // If no subjectId, we should probably ONLY return records for subjects the faculty teaches.
                // I will add a filter later in the query construction.
            }
        }

        // Build Where Clause
        const where: any = {};

        if (studentId) where.studentId = studentId;
        if (subjectId) where.subjectId = subjectId;
        if (dateStr) where.date = new Date(dateStr);

        // Forced filtering for Students
        if (session.user.role === "STUDENT") {
            const student = await prisma.student.findUnique({ where: { userId: session.user.id } });
            if (student) where.studentId = student.id;
        }

        // Strict filtering for Faculty (if no subjectId provided, limit to assigned subjects)
        if (session.user.role === "FACULTY" && !subjectId) {
            const faculty = await prisma.faculty.findUnique({
                where: { userId: session.user.id },
                include: { subjects: true }
            });
            if (faculty) {
                const subjectIds = faculty.subjects.map(s => s.id);
                where.subjectId = { in: subjectIds };
            }
        }


        if (summary && studentId) {
            // Summary logic (Aggregation)
            const records = await prisma.attendance.findMany({
                where: where, // Apply all filters
                include: { subject: true }
            });

            // Group by subject
            const subjectStats = new Map<string, { subject: any, total: number, attended: number }>();

            records.forEach(r => {
                if (!subjectStats.has(r.subjectId)) {
                    subjectStats.set(r.subjectId, { subject: r.subject, total: 0, attended: 0 });
                }
                const stat = subjectStats.get(r.subjectId)!;
                stat.total++;
                if (r.status === "PRESENT") stat.attended++;
            });

            const summaryData = Array.from(subjectStats.values()).map(stat => ({
                subjectId: stat.subject.id,
                subjectName: stat.subject.name,
                subjectCode: stat.subject.code,
                totalClasses: stat.total,
                attended: stat.attended,
                percentage: stat.total > 0 ? Math.round((stat.attended / stat.total) * 100) : 0
            }));

            const overallAttended = records.filter(r => r.status === "PRESENT").length;
            const overallTotal = records.length;

            return NextResponse.json({
                success: true,
                data: {
                    subjects: summaryData,
                    overall: {
                        totalClasses: overallTotal,
                        attended: overallAttended,
                        percentage: overallTotal > 0 ? Math.round((overallAttended / overallTotal) * 100) : 0,
                    }
                }
            });
        }

        // Normal List
        const records = await prisma.attendance.findMany({
            where,
            include: {
                student: { select: { user: { select: { name: true } }, rollNumber: true } },
                subject: { select: { name: true, code: true } },
                markedBy: { select: { user: { select: { name: true } } } }
            },
            orderBy: { date: 'desc' }
        });

        // Format for response
        const formatted = records.map(r => ({
            id: r.id,
            date: r.date.toISOString().split('T')[0],
            status: r.status,
            studentId: r.studentId,
            studentName: r.student.user.name,
            rollNumber: r.student.rollNumber,
            subjectId: r.subjectId,
            subjectName: r.subject.name,
            subjectCode: r.subject.code,
            markedBy: r.markedBy?.user?.name || "Unknown"
        }));

        return NextResponse.json({
            success: true,
            data: formatted,
            total: formatted.length
        });

    } catch (error) {
        console.error("Attendance GET Error:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/attendance - Submit attendance
export async function POST(request: NextRequest) {
    const session = await auth();

    if (!session || !session.user) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "FACULTY" && session.user.role !== "ADMIN") {
        return NextResponse.json({ success: false, error: "Forbidden: Only Faculty/Admin can mark attendance" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { subjectId, date, records } = body;

        if (!subjectId || !date || !records || !Array.isArray(records)) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
        }

        // Auth Check: Faculty must own subject
        if (session.user.role === "FACULTY") {
            const isAuthorized = await validateSubjectOwnership(session.user.id, subjectId);
            if (!isAuthorized) {
                return NextResponse.json({ success: false, error: "Forbidden: You are not assigned to this subject" }, { status: 403 });
            }
        }

        // Get Faculty ID
        let markedById = "";
        const faculty = await prisma.faculty.findUnique({ where: { userId: session.user.id } });

        if (faculty) {
            markedById = faculty.id;
        } else {
            // Admin might not have faculty profile.
            // If Admin, they must have a way to be identified in 'markedBy'.
            // Simplest: Admin creates a 'dummy' faculty profile for themselves? Or we fail.
            // Given constraint, let's fail if no faculty profile.
            return NextResponse.json({ success: false, error: "User must have a Faculty/Staff profile to mark attendance" }, { status: 400 });
        }

        const dateObj = new Date(date);

        // Transaction
        const operations = records.map((record: any) => {
            return prisma.attendance.upsert({
                where: {
                    studentId_subjectId_date: {
                        studentId: record.studentId,
                        subjectId: subjectId,
                        date: dateObj
                    }
                },
                update: {
                    status: record.status as AttendanceStatus,
                    markedById: markedById
                },
                create: {
                    studentId: record.studentId,
                    subjectId: subjectId,
                    date: dateObj,
                    status: record.status as AttendanceStatus,
                    markedById: markedById
                }
            });
        });

        await prisma.$transaction(operations);

        return NextResponse.json({
            success: true,
            message: "Attendance marked successfully"
        }, { status: 201 });

    } catch (error) {
        console.error("Attendance POST Error:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
