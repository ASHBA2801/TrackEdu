import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/departments - Get all departments
export async function GET() {
    try {
        const departments = await prisma.department.findMany({
            where: { isDeleted: false },
            include: {
                _count: {
                    select: { students: { where: { isDeleted: false } }, faculties: { where: { isDeleted: false } } }
                }
            },
            orderBy: { name: "asc" }
        });

        return NextResponse.json({
            success: true,
            data: departments,
            total: departments.length,
        });
    } catch (error) {
        console.error("Get departments error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch departments" }, { status: 500 });
    }
}

// POST /api/departments - Create a new department
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, code } = body;

        if (!name || !code) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        const newDepartment = await prisma.department.create({
            data: {
                name,
                code,
            },
        });

        return NextResponse.json({
            success: true,
            data: newDepartment,
            message: "Department created successfully",
        }, { status: 201 });
    } catch (error) {
        console.error("Create department error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create department" },
            { status: 500 }
        );
    }
}
