
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ sessionId: string }> }
) {
    try {
        const params = await props.params;
        const { sessionId } = params;

        // 1. Close session and disable QR
        const session = await prisma.classSession.update({
            where: { id: sessionId },
            data: {
                status: "COMPLETED",
                endTime: new Date(),
                qrEnabled: false,
                currentQrCode: null,
            },
            include: {
                subject: {
                    include: {
                        // We need students enrolled in the DEPARTMENT of the subject? 
                        // Or explicitly enrolled users?
                        // Schema: Student has departmentId, Subject has departmentId. 
                        // Usually all students in dept take the subject? Or specific enrollment?
                        // Prompt says "student is enrolled in that subject".
                        // Schema doesn't show explicit student-subject enrollment table.
                        // It shows Subject -> Department and Student -> Department.
                        // Assume all students in Department are enrolled, OR check existing code pattern.
                        // Wait, Subject has `semester`. Student has `year`.
                        // I'll assume matching Department is the enrollment for now.
                        department: {
                            include: {
                                students: true
                            }
                        }
                    }
                }
            }
        });

        if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

        // 2. Finalize Attendance
        // Find all potential students
        const potentialStudents = session.subject.department.students.filter(s => s.isActive && !s.isDeleted);

        // Find already marked students
        const existingAttendance = await prisma.attendance.findMany({
            where: { classSessionId: sessionId },
            select: { studentId: true }
        });

        const presentStudentIds = new Set(existingAttendance.map(a => a.studentId));

        // Identify absents
        const absentStudents = potentialStudents.filter(s => !presentStudentIds.has(s.id));

        // Bulk create ABSENT records
        if (absentStudents.length > 0) {
            await prisma.attendance.createMany({
                data: absentStudents.map(s => ({
                    date: session.startTime, // Use session date
                    status: "ABSENT",
                    studentId: s.id,
                    subjectId: session.subjectId,
                    classSessionId: sessionId,
                }))
            });
        }

        return NextResponse.json({ success: true, absentsMarked: absentStudents.length });
    } catch (error) {
        console.error("Error ending session:", error);
        return NextResponse.json({ error: "Failed to end session" }, { status: 500 });
    }
}
