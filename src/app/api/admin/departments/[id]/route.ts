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

        // Check if department exists
        const dept = await prisma.department.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        students: { where: { isDeleted: false } },
                        faculties: { where: { isDeleted: false } },
                        subjects: { where: { isDeleted: false } },
                    }
                }
            }
        });

        if (!dept) {
            return NextResponse.json({ error: "Department not found" }, { status: 404 });
        }

        // Check constraints
        if (dept._count.students > 0) {
            return NextResponse.json({ error: "Cannot delete department with active students" }, { status: 400 });
        }
        if (dept._count.faculties > 0) {
            console.log(dept._count);
            return NextResponse.json({ error: "Cannot delete department with active faculty" }, { status: 400 });
        }
        if (dept._count.subjects > 0) {
            return NextResponse.json({ error: "Cannot delete department with active subjects" }, { status: 400 });
        }

        // Soft delete
        await prisma.department.update({
            where: { id },
            data: { isDeleted: true }
        });

        return NextResponse.json({ message: "Department deleted successfully" });
    } catch (error) {
        console.error("Delete department error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
