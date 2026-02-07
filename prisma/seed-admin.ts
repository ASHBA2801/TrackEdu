import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@trackedu.com';
    const password = 'admin123'; // Change this!
    const name = 'System Admin';

    // Check if admin already exists
    const existing = await prisma.user.findUnique({
        where: { email },
    });

    if (existing) {
        console.log('Admin user already exists:', email);
        return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const admin = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            role: 'ADMIN',
            isActive: true,
            isPasswordChangeRequired: false,
        },
    });

    console.log('✅ Admin user created successfully!');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('   User ID:', admin.id);
}

main()
    .catch((e) => {
        console.error('Error creating admin:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
