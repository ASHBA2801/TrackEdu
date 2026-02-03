import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

// GET /api/admin/users - List all users
export async function GET(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is admin
        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const search = searchParams.get("search") || "";
        const roleFilter = searchParams.get("role") || "";

        const skip = (page - 1) * limit;

        // Build where clause
        const where: {
            OR?: { name?: { contains: string; mode: "insensitive" }; email?: { contains: string; mode: "insensitive" } }[];
            role?: UserRole;
            isDeleted: boolean;
        } = {
            isDeleted: false
        };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
            ];
        }

        if (roleFilter && ["STUDENT", "FACULTY", "ADMIN"].includes(roleFilter)) {
            where.role = roleFilter as UserRole;
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.user.count({ where }),
        ]);

        return NextResponse.json({
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get users error:", error);
        return NextResponse.json(
            { error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}

// PATCH /api/admin/users - Update user role or status
export async function PATCH(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { userId, role, isActive } = body;

        if (!userId) {
            return NextResponse.json(
                { error: "User ID is required" },
                { status: 400 }
            );
        }

        // Prevent admin from modifying their own account
        if (userId === session.user.id) {
            return NextResponse.json(
                { error: "Cannot modify your own account" },
                { status: 400 }
            );
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Build update data
        const updateData: { role?: UserRole; isActive?: boolean } = {};

        if (role !== undefined) {
            if (!["STUDENT", "FACULTY", "ADMIN"].includes(role)) {
                return NextResponse.json(
                    { error: "Invalid role" },
                    { status: 400 }
                );
            }
            updateData.role = role as UserRole;
        }

        if (isActive !== undefined) {
            if (typeof isActive !== "boolean") {
                return NextResponse.json(
                    { error: "isActive must be a boolean" },
                    { status: 400 }
                );
            }
            updateData.isActive = isActive;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: "No update data provided" },
                { status: 400 }
            );
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
            },
        });

        return NextResponse.json({
            message: "User updated successfully",
            user: updatedUser,
        });
    } catch (error) {
        console.error("Update user error:", error);
        return NextResponse.json(
            { error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/users - Soft delete user
export async function DELETE(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json(
                { error: "User ID is required" },
                { status: 400 }
            );
        }

        if (userId === session.user.id) {
            return NextResponse.json(
                { error: "Cannot delete your own account" },
                { status: 400 }
            );
        }

        // Check user role before deleting (Prevent deleting Admins/SuperAdmin)
        const userToDelete = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (userToDelete?.role === "ADMIN") {
            return NextResponse.json(
                { error: "Cannot delete an Administrator account" },
                { status: 403 }
            );
        }

        await prisma.user.update({
            where: { id: userId },
            data: { isDeleted: true, isActive: false },
        });

        return NextResponse.json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Delete user error:", error);
        return NextResponse.json(
            { error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
