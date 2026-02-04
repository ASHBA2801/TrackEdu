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

        // Check if class exists
        const classItem = await prisma.classroom.findUnique({
            where: { id },
        });

        if (!classItem) {
            return NextResponse.json({ error: "Class not found" }, { status: 404 });
        }

        // Soft delete
        await prisma.classroom.update({
            where: { id },
            data: { isDeleted: true }
        });

        return NextResponse.json({ message: "Class deleted successfully" });
    } catch (error) {
        console.error("Delete class error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
