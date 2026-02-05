import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const facultyPassword = await bcrypt.hash('faculty123', 12);
    const studentPassword = await bcrypt.hash('student123', 12);

    // Upsert Admin
    await prisma.user.upsert({
        where: { email: 'admin@trackedu.com' },
        update: {},
        create: {
            email: 'admin@trackedu.com',
            password: hashedPassword,
            name: 'System Admin',
            role: 'ADMIN',
        },
    });

    // Upsert Faculty
    await prisma.user.upsert({
        where: { email: 'faculty@trackedu.com' },
        update: {},
        create: {
            email: 'faculty@trackedu.com',
            password: facultyPassword,
            name: 'John Doe',
            role: 'FACULTY',
        },
    });

    // Upsert Student
    await prisma.user.upsert({
        where: { email: 'student@trackedu.com' },
        update: {},
        create: {
            email: 'student@trackedu.com',
            password: studentPassword,
            name: 'Jane Smith',
            role: 'STUDENT',
        },
    });

    console.log('✅ Seed data created successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
