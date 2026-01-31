// User roles
export type UserRole = 'student' | 'faculty' | 'admin';

// Department
export interface Department {
  id: string;
  name: string;
  code: string;
}

// Subject
export interface Subject {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  semester: number;
  credits: number;
}

// Student
export interface Student {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  departmentId: string;
  year: number;
  section: string;
  isActive: boolean;
}

// Faculty
export interface Faculty {
  id: string;
  name: string;
  email: string;
  departmentId: string;
  assignedSubjects: string[]; // Subject IDs
  isActive: boolean;
}

// Attendance Status
export type AttendanceStatus = 'present' | 'absent';

// Attendance Record
export interface Attendance {
  id: string;
  studentId: string;
  subjectId: string;
  date: string; // ISO date string
  status: AttendanceStatus;
  markedBy: string; // Faculty ID
}

// Timetable Entry
export interface TimetableEntry {
  day: string;
  periods: {
    time: string;
    subjectId: string;
    subjectName: string;
  }[];
}

// User (for mock auth)
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleId: string; // References Student/Faculty ID based on role
}

// Attendance Summary
export interface AttendanceSummary {
  subjectId: string;
  subjectName: string;
  totalClasses: number;
  attended: number;
  percentage: number;
}
