
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateDistance } from "@/lib/utils/qr";

export async function POST(req: NextRequest) {
    try {
        // 1. Validate Payload
        const body = await req.json();
        const { qrCode, studentId, latitude, longitude } = body;

        if (!qrCode || !studentId || latitude === undefined || longitude === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const userLoc = { lat: parseFloat(latitude), lng: parseFloat(longitude) };

        // 2. Find ACTIVE session with matching code
        // "Code must map to exactly one ACTIVE class session"
        // "Code is valid only if... now < currentQrExpiresAt"
        const now = new Date();
        const session = await prisma.classSession.findFirst({
            where: {
                currentQrCode: qrCode,
                status: "ACTIVE",
                qrEnabled: true,
                currentQrExpiresAt: {
                    gt: now
                }
            },
            include: {
                subject: true
            }
        });

        if (!session) {
            return NextResponse.json({ error: "Invalid or expired QR code" }, { status: 400 });
        }

        // 3. Check Location (Radius 25-40m)
        // If session has location set
        if (session.latitude && session.longitude) {
            const dist = calculateDistance(session.latitude, session.longitude, userLoc.lat, userLoc.lng);
            if (dist > 40) { // Using 40m as upper bound
                return NextResponse.json({ error: "You are too far from the class" }, { status: 400 });
            }
        }

        // 4. Check Enrollment
        // Validate student belongs to subject's department.
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { departmentId: true, id: true }
        });

        if (!student || student.departmentId !== session.subject.departmentId) {
            return NextResponse.json({ error: "Not enrolled in this subject" }, { status: 403 });
        }

        // 5. Upsert Attendance
        // "student not already marked present" -> Upsert handles this or check first.
        // Use upsert to be safe/idempotent.
        const attendance = await prisma.attendance.upsert({
            where: {
                studentId_classSessionId: {
                    studentId: student.id,
                    classSessionId: session.id
                }
            },
            update: {
                // Already exists, do nothing or ensure PRESENT?
                status: "PRESENT"
            },
            create: {
                studentId: student.id,
                subjectId: session.subjectId,
                classSessionId: session.id,
                date: new Date(), // Using current time/date
                status: "PRESENT",
            }
        });

        return NextResponse.json({ success: true, attendance });

    } catch (error) {
        console.error("Error scanning QR:", error);
        return NextResponse.json({ error: "Failed to mark attendance" }, { status: 500 });
    }
}
