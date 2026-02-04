import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";

/**
 * Validates if a faculty member is authorized to manage a specific subject.
 * Checks if the user exists, is a faculty member, and has the subject assigned.
 * 
 * @param userId The ID of the user (must be a faculty member)
 * @param subjectId The ID of the subject to check
 * @returns boolean - true if authorized, false otherwise
 */
export async function validateSubjectOwnership(userId: string, subjectId: string): Promise<boolean> {
    if (!userId || !subjectId) return false;

    try {
        const faculty = await prisma.faculty.findUnique({
            where: { userId: userId },
            include: {
                subjects: {
                    select: {
                        id: true
                    }
                }
            }
        });

        if (!faculty) return false;

        // Check if the subject is in the faculty's assigned subjects
        return faculty.subjects.some(sub => sub.id === subjectId);
    } catch (error) {
        console.error("Error validating subject ownership:", error);
        return false;
    }
}

/**
 * Validates if a user (Admin or Faculty) has access to a specific department.
 * Admins have access to all. Faculty only to their own department.
 */
export async function validateDepartmentAccess(userId: string, role: UserRole, departmentId: string): Promise<boolean> {
    if (role === "ADMIN") return true;
    if (role !== "FACULTY") return false;

    try {
        const faculty = await prisma.faculty.findUnique({
            where: { userId: userId },
            select: { departmentId: true }
        });

        if (!faculty) return false;

        return faculty.departmentId === departmentId;
    } catch (error) {
        console.error("Error validating department access:", error);
        return false;
    }
}
