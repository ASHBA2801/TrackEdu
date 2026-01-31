import {
    Department,
    Subject,
    Student,
    Faculty,
    Attendance,
    TimetableEntry,
    User,
} from '@/types';

// Departments
export const departments: Department[] = [
    { id: 'dept-1', name: 'Computer Science', code: 'CSE' },
    { id: 'dept-2', name: 'Electronics & Communication', code: 'ECE' },
    { id: 'dept-3', name: 'Mechanical Engineering', code: 'ME' },
    { id: 'dept-4', name: 'Civil Engineering', code: 'CE' },
];

// Subjects
export const subjects: Subject[] = [
    { id: 'sub-1', name: 'Data Structures', code: 'CS201', departmentId: 'dept-1', semester: 3, credits: 4 },
    { id: 'sub-2', name: 'Database Management', code: 'CS301', departmentId: 'dept-1', semester: 5, credits: 4 },
    { id: 'sub-3', name: 'Operating Systems', code: 'CS302', departmentId: 'dept-1', semester: 5, credits: 3 },
    { id: 'sub-4', name: 'Computer Networks', code: 'CS401', departmentId: 'dept-1', semester: 7, credits: 4 },
    { id: 'sub-5', name: 'Web Development', code: 'CS303', departmentId: 'dept-1', semester: 5, credits: 3 },
    { id: 'sub-6', name: 'Digital Electronics', code: 'EC201', departmentId: 'dept-2', semester: 3, credits: 4 },
    { id: 'sub-7', name: 'Signal Processing', code: 'EC301', departmentId: 'dept-2', semester: 5, credits: 4 },
];

// Students
export const students: Student[] = [
    { id: 'stu-1', name: 'Rahul Sharma', email: 'rahul@college.edu', rollNumber: 'CSE2021001', departmentId: 'dept-1', year: 3, section: 'A', isActive: true },
    { id: 'stu-2', name: 'Priya Patel', email: 'priya@college.edu', rollNumber: 'CSE2021002', departmentId: 'dept-1', year: 3, section: 'A', isActive: true },
    { id: 'stu-3', name: 'Amit Kumar', email: 'amit@college.edu', rollNumber: 'CSE2021003', departmentId: 'dept-1', year: 3, section: 'A', isActive: true },
    { id: 'stu-4', name: 'Sneha Reddy', email: 'sneha@college.edu', rollNumber: 'CSE2021004', departmentId: 'dept-1', year: 3, section: 'A', isActive: true },
    { id: 'stu-5', name: 'Vikram Singh', email: 'vikram@college.edu', rollNumber: 'CSE2021005', departmentId: 'dept-1', year: 3, section: 'B', isActive: true },
    { id: 'stu-6', name: 'Anjali Gupta', email: 'anjali@college.edu', rollNumber: 'CSE2021006', departmentId: 'dept-1', year: 3, section: 'B', isActive: true },
    { id: 'stu-7', name: 'Rohan Mehta', email: 'rohan@college.edu', rollNumber: 'CSE2022001', departmentId: 'dept-1', year: 2, section: 'A', isActive: true },
    { id: 'stu-8', name: 'Kavya Nair', email: 'kavya@college.edu', rollNumber: 'ECE2021001', departmentId: 'dept-2', year: 3, section: 'A', isActive: true },
    { id: 'stu-9', name: 'Arjun Das', email: 'arjun@college.edu', rollNumber: 'ECE2021002', departmentId: 'dept-2', year: 3, section: 'A', isActive: false },
    { id: 'stu-10', name: 'Meera Iyer', email: 'meera@college.edu', rollNumber: 'CSE2021007', departmentId: 'dept-1', year: 3, section: 'A', isActive: true },
];

// Faculty
export const faculty: Faculty[] = [
    { id: 'fac-1', name: 'Dr. Rajesh Kumar', email: 'rajesh@college.edu', departmentId: 'dept-1', assignedSubjects: ['sub-1', 'sub-2'], isActive: true },
    { id: 'fac-2', name: 'Prof. Sunita Sharma', email: 'sunita@college.edu', departmentId: 'dept-1', assignedSubjects: ['sub-3', 'sub-4'], isActive: true },
    { id: 'fac-3', name: 'Dr. Anil Verma', email: 'anil@college.edu', departmentId: 'dept-1', assignedSubjects: ['sub-5'], isActive: true },
    { id: 'fac-4', name: 'Prof. Lakshmi Menon', email: 'lakshmi@college.edu', departmentId: 'dept-2', assignedSubjects: ['sub-6', 'sub-7'], isActive: true },
    { id: 'fac-5', name: 'Dr. Suresh Babu', email: 'suresh@college.edu', departmentId: 'dept-2', assignedSubjects: [], isActive: false },
];

// Generate attendance records for the past 30 days
const generateAttendanceRecords = (): Attendance[] => {
    const records: Attendance[] = [];
    const today = new Date();

    // For each student in CSE dept, generate attendance for their subjects
    const cseStudents = students.filter(s => s.departmentId === 'dept-1' && s.isActive);
    const cseSubjects = ['sub-1', 'sub-2', 'sub-3', 'sub-5'];

    cseStudents.forEach(student => {
        cseSubjects.forEach(subjectId => {
            // Generate records for past 20 class days
            for (let i = 0; i < 20; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - i - 1);

                // Skip weekends
                if (date.getDay() === 0 || date.getDay() === 6) continue;

                // Random attendance with 80% present rate
                const isPresent = Math.random() > 0.2;

                records.push({
                    id: `att-${student.id}-${subjectId}-${i}`,
                    studentId: student.id,
                    subjectId,
                    date: date.toISOString().split('T')[0],
                    status: isPresent ? 'present' : 'absent',
                    markedBy: 'fac-1',
                });
            }
        });
    });

    return records;
};

export const attendance: Attendance[] = generateAttendanceRecords();

// Timetable for CSE 3rd Year Section A
export const timetable: TimetableEntry[] = [
    {
        day: 'Monday',
        periods: [
            { time: '09:00 - 10:00', subjectId: 'sub-1', subjectName: 'Data Structures' },
            { time: '10:00 - 11:00', subjectId: 'sub-2', subjectName: 'Database Management' },
            { time: '11:15 - 12:15', subjectId: 'sub-3', subjectName: 'Operating Systems' },
            { time: '14:00 - 15:00', subjectId: 'sub-5', subjectName: 'Web Development' },
        ],
    },
    {
        day: 'Tuesday',
        periods: [
            { time: '09:00 - 10:00', subjectId: 'sub-2', subjectName: 'Database Management' },
            { time: '10:00 - 11:00', subjectId: 'sub-1', subjectName: 'Data Structures' },
            { time: '11:15 - 12:15', subjectId: 'sub-5', subjectName: 'Web Development' },
            { time: '14:00 - 16:00', subjectId: 'sub-1', subjectName: 'Data Structures Lab' },
        ],
    },
    {
        day: 'Wednesday',
        periods: [
            { time: '09:00 - 10:00', subjectId: 'sub-3', subjectName: 'Operating Systems' },
            { time: '10:00 - 11:00', subjectId: 'sub-2', subjectName: 'Database Management' },
            { time: '11:15 - 12:15', subjectId: 'sub-1', subjectName: 'Data Structures' },
            { time: '14:00 - 16:00', subjectId: 'sub-2', subjectName: 'Database Lab' },
        ],
    },
    {
        day: 'Thursday',
        periods: [
            { time: '09:00 - 10:00', subjectId: 'sub-5', subjectName: 'Web Development' },
            { time: '10:00 - 11:00', subjectId: 'sub-3', subjectName: 'Operating Systems' },
            { time: '11:15 - 12:15', subjectId: 'sub-2', subjectName: 'Database Management' },
            { time: '14:00 - 16:00', subjectId: 'sub-5', subjectName: 'Web Development Lab' },
        ],
    },
    {
        day: 'Friday',
        periods: [
            { time: '09:00 - 10:00', subjectId: 'sub-1', subjectName: 'Data Structures' },
            { time: '10:00 - 11:00', subjectId: 'sub-5', subjectName: 'Web Development' },
            { time: '11:15 - 12:15', subjectId: 'sub-3', subjectName: 'Operating Systems' },
            { time: '14:00 - 15:00', subjectId: 'sub-2', subjectName: 'Database Management' },
        ],
    },
];

// Mock Users for authentication
export const users: User[] = [
    { id: 'user-1', name: 'Rahul Sharma', email: 'rahul@college.edu', role: 'student', roleId: 'stu-1' },
    { id: 'user-2', name: 'Dr. Rajesh Kumar', email: 'rajesh@college.edu', role: 'faculty', roleId: 'fac-1' },
    { id: 'user-3', name: 'Admin User', email: 'admin@college.edu', role: 'admin', roleId: 'admin-1' },
];

// Helper functions
export const getStudentById = (id: string) => students.find(s => s.id === id);
export const getFacultyById = (id: string) => faculty.find(f => f.id === id);
export const getSubjectById = (id: string) => subjects.find(s => s.id === id);
export const getDepartmentById = (id: string) => departments.find(d => d.id === id);

export const getStudentsByDepartment = (deptId: string) =>
    students.filter(s => s.departmentId === deptId);

export const getSubjectsByDepartment = (deptId: string) =>
    subjects.filter(s => s.departmentId === deptId);

export const getAttendanceByStudent = (studentId: string) =>
    attendance.filter(a => a.studentId === studentId);

export const getAttendanceBySubject = (subjectId: string) =>
    attendance.filter(a => a.subjectId === subjectId);

export const calculateAttendancePercentage = (studentId: string, subjectId?: string) => {
    let records = attendance.filter(a => a.studentId === studentId);
    if (subjectId) {
        records = records.filter(a => a.subjectId === subjectId);
    }
    if (records.length === 0) return 0;
    const present = records.filter(a => a.status === 'present').length;
    return Math.round((present / records.length) * 100);
};
