import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Check if student exists
        const student = await prisma.student.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        attendance: true
                    }
                }
            }
        });

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        // Check constraints
        if (student._count.attendance > 0) {
            return NextResponse.json({ error: "Cannot delete student with existing attendance records" }, { status: 400 });
        }

        // Soft delete
        await prisma.student.update({
            where: { id },
            data: {
                isDeleted: true,
                isActive: false
            }
        });

        // Optionally deactivate the user account associated
        if (student.userId) {
            try {
                // Get current user email first
                const user = await prisma.user.findUnique({ where: { id: student.userId }, select: { email: true } });
                if (user) {
                    const timestamp = new Date().getTime();
                    await prisma.user.update({
                        where: { id: student.userId },
                        data: {
                            isActive: false,
                            isDeleted: true, // Soft delete the user
                            email: `deleted_${timestamp}_${user.email}`
                        }
                    });
                }
            } catch (e) {
                console.error("Failed to deactivate user for student", e);
            }
        }

        return NextResponse.json({ message: "Student deleted successfully" });
    } catch (error) {
        console.error("Delete student error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
