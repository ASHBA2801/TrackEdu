import prisma from "./prisma";

export { prisma };

/**
 * Get a user by their email address
 * @param email - User's email address
 * @returns User object or null if not found
 */
export async function getUserByEmail(email: string) {
    return prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            name: true,
            email: true,
            password: true,
            role: true,
            isActive: true,
            isPasswordChangeRequired: true,
        },
    });
}

/**
 * Get a user by their ID
 * @param id - User's ID
 * @returns User object or null if not found
 */
export async function getUserById(id: string) {
    return prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
        },
    });
}
