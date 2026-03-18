import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/subjects - Get all subjects
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const departmentId = searchParams.get("departmentId");
        const semester = searchParams.get("semester");

        const where: { isDeleted: boolean; departmentId?: string; semester?: number } = { isDeleted: false };

        if (departmentId) {
            where.departmentId = departmentId;
        }

        if (semester) {
            where.semester = parseInt(semester);
        }

        const subjects = await prisma.subject.findMany({
            where,
            include: {
                department: true,
            },
            orderBy: {
                code: "asc",
            },
        });

        const subjectsWithDept = subjects.map((subject) => ({
            ...subject,
            departmentName: subject.department?.name || "Unknown",
        }));

        return NextResponse.json({
            success: true,
            data: subjectsWithDept,
            total: subjectsWithDept.length,
        });
    } catch (error) {
        console.error("Get subjects error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch subjects" }, { status: 500 });
    }
}

// POST /api/subjects - Create a new subject
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, code, departmentId, semester, credits } = body;

        if (!name || !code || !departmentId || !semester || !credits) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        const newSubject = await prisma.subject.create({
            data: {
                name,
                code,
                departmentId,
                semester: parseInt(semester.toString()),
                credits: parseInt(credits.toString()),
            },
            include: { department: true }
        });

        return NextResponse.json({
            success: true,
            data: newSubject,
            message: "Subject created successfully",
        }, { status: 201 });
    } catch (error) {
        console.error("Create subject error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create subject" },
            { status: 500 }
        );
    }
}
