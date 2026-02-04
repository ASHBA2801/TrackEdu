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

        // Check if faculty exists
        const faculty = await prisma.faculty.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        subjects: true,
                        attendanceMarked: true
                    }
                }
            }
        });

        if (!faculty) {
            return NextResponse.json({ error: "Faculty not found" }, { status: 404 });
        }

        // Check constraints
        if (faculty._count.subjects > 0) {
            return NextResponse.json({ error: "Cannot delete faculty assigned to subjects" }, { status: 400 });
        }

        // Soft delete
        await prisma.faculty.update({
            where: { id },
            data: {
                isDeleted: true,
                isActive: false
            }
        });

        // Optionally deactivate the user account associated
        if (faculty.userId) {
            try {
                // Get current user email first to append
                const user = await prisma.user.findUnique({ where: { id: faculty.userId }, select: { email: true } });
                if (user) {
                    const timestamp = new Date().getTime();
                    await prisma.user.update({
                        where: { id: faculty.userId },
                        data: {
                            isActive: false,
                            isDeleted: true, // Also soft delete the user
                            email: `deleted_${timestamp}_${user.email}`
                        }
                    });
                }
            } catch (e) {
                console.error("Failed to deactivate user for faculty", e);
            }
        }

        return NextResponse.json({ message: "Faculty deleted successfully" });
    } catch (error) {
        console.error("Delete faculty error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
