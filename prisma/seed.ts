import { PrismaClient, UserRole, AttendanceStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seed started...');

    // 1. Clear existing data
    await prisma.attendance.deleteMany();
    await prisma.student.deleteMany();
    await prisma.faculty.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.department.deleteMany();
    await prisma.user.deleteMany();

    // 2. Create Departments
    const dept1 = await prisma.department.create({
        data: { id: 'dept-1', name: 'Computer Science', code: 'CSE' },
    });
    await prisma.department.create({
        data: { id: 'dept-2', name: 'Electronics & Communication', code: 'ECE' },
    });
    await prisma.department.create({
        data: { id: 'dept-3', name: 'Mechanical Engineering', code: 'ME' },
    });
    await prisma.department.create({
        data: { id: 'dept-4', name: 'Civil Engineering', code: 'CE' },
    });

    console.log('Departments created');

    // 3. Create Subjects
    const subjectsData = [
        { id: 'sub-1', name: 'Data Structures', code: 'CS201', departmentId: 'dept-1', semester: 3, credits: 4 },
        { id: 'sub-2', name: 'Database Management', code: 'CS301', departmentId: 'dept-1', semester: 5, credits: 4 },
        { id: 'sub-3', name: 'Operating Systems', code: 'CS302', departmentId: 'dept-1', semester: 5, credits: 3 },
        { id: 'sub-4', name: 'Computer Networks', code: 'CS401', departmentId: 'dept-1', semester: 7, credits: 4 },
        { id: 'sub-5', name: 'Web Development', code: 'CS303', departmentId: 'dept-1', semester: 5, credits: 3 },
        { id: 'sub-6', name: 'Digital Electronics', code: 'EC201', departmentId: 'dept-2', semester: 3, credits: 4 },
        { id: 'sub-7', name: 'Signal Processing', code: 'EC301', departmentId: 'dept-2', semester: 5, credits: 4 },
    ];

    for (const s of subjectsData) {
        await prisma.subject.create({ data: s });
    }

    console.log('Subjects created');

    // 4. Create Users, Students, and Faculty
    const usersData = [
        { id: 'user-1', name: 'Rahul Sharma', email: 'rahul@college.edu', role: UserRole.STUDENT, roleId: 'stu-1' },
        { id: 'user-2', name: 'Dr. Rajesh Kumar', email: 'rajesh@college.edu', role: UserRole.FACULTY, roleId: 'fac-1' },
        { id: 'user-3', name: 'Admin User', email: 'admin@college.edu', role: UserRole.ADMIN, roleId: 'admin-1' },
    ];

    for (const u of usersData) {
        const user = await prisma.user.create({
            data: {
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
            },
        });

        if (u.role === UserRole.STUDENT) {
            await prisma.student.create({
                data: {
                    id: u.roleId,
                    userId: user.id,
                    rollNumber: 'CSE2021001',
                    year: 3,
                    section: 'A',
                    departmentId: 'dept-1',
                },
            });
        } else if (u.role === UserRole.FACULTY) {
            await prisma.faculty.create({
                data: {
                    id: u.roleId,
                    userId: user.id,
                    departmentId: 'dept-1',
                    subjects: {
                        connect: [{ id: 'sub-1' }, { id: 'sub-2' }]
                    }
                },
            });
        }
    }

    // Add more students for demo
    const moreStudents = [
        { id: 'stu-2', name: 'Priya Patel', email: 'priya@college.edu', rollNumber: 'CSE2021002', dept: 'dept-1', userId: 'u-stu-2' },
        { id: 'stu-3', name: 'Amit Kumar', email: 'amit@college.edu', rollNumber: 'CSE2021003', dept: 'dept-1', userId: 'u-stu-3' },
        { id: 'stu-4', name: 'Sneha Reddy', email: 'sneha@college.edu', rollNumber: 'CSE2021004', dept: 'dept-1', userId: 'u-stu-4' },
    ];

    for (const s of moreStudents) {
        const user = await prisma.user.create({
            data: { id: s.userId, name: s.name, email: s.email, role: UserRole.STUDENT }
        });
        await prisma.student.create({
            data: {
                id: s.id,
                userId: user.id,
                rollNumber: s.rollNumber,
                year: 3,
                section: 'A',
                departmentId: s.dept,
            }
        });
    }

    console.log('Users and Roles created');

    // 5. Generate Attendance Records
    const studentsList = await prisma.student.findMany();
    const subjectsList = ['sub-1', 'sub-2', 'sub-3', 'sub-5'];
    const today = new Date();

    console.log('Generating attendance...');
    for (const student of studentsList) {
        for (const subId of subjectsList) {
            for (let i = 0; i < 10; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - i - 1);
                if (date.getDay() === 0 || date.getDay() === 6) continue;

                await prisma.attendance.create({
                    data: {
                        studentId: student.id,
                        subjectId: subId,
                        date: date,
                        status: Math.random() > 0.2 ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT,
                        markedById: 'fac-1',
                    }
                }).catch(() => { });
            }
        }
    }

    console.log('Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
