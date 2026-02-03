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

        // Check if subject exists
        const subject = await prisma.subject.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        attendance: true,
                        faculties: true
                    }
                }
            }
        });

        if (!subject) {
            return NextResponse.json({ error: "Subject not found" }, { status: 404 });
        }

        // Check constraints
        if (subject._count.attendance > 0) {
            return NextResponse.json({ error: "Cannot delete subject with existing attendance records" }, { status: 400 });
        }

        // Soft delete
        await prisma.subject.update({
            where: { id },
            data: { isDeleted: true }
        });

        return NextResponse.json({ message: "Subject deleted successfully" });
    } catch (error) {
        console.error("Delete subject error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
