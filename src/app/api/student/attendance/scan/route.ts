
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

        // 3. Check Location (Radius 50m)
        // If session has location set
        if (session.latitude && session.longitude) {
            const dist = calculateDistance(session.latitude, session.longitude, userLoc.lat, userLoc.lng);

            // Temporary Debug Logging
            console.log("--- QR SCAN DEBUG ---");
            console.log(`Student ID: ${studentId}`);
            console.log(`Session ID: ${session.id}`);
            console.log(`Faculty Loc: ${session.latitude}, ${session.longitude}`);
            console.log(`Student Loc: ${userLoc.lat}, ${userLoc.lng}`);
            console.log(`Distance: ${dist.toFixed(2)} meters`);
            console.log("---------------------");

            if (dist > 50) { // Increased to 50m
                return NextResponse.json({
                    error: `You are too far from the class (${Math.round(dist)}m > 50m). Please move closer to the faculty.`
                }, { status: 400 });
            }
        } else {
            console.log("Session has no location data, skipping distance check.");
        }

        // 4. Check Enrollment
        // Validate student belongs to subject's department.
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { departmentId: true, id: true }
        });

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        // TODO: Enable enrollment validation when HOD module is implemented.
        // Currently, we allow any logged-in student to scan if they have the code.
        /*
        if (student.departmentId !== session.subject.departmentId) {
            return NextResponse.json({ error: "Not enrolled in this subject" }, { status: 403 });
        }
        */

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
