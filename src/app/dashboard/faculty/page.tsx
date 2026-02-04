'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header, RoleGuard } from '@/components/layout';
import { Card, Button, AttendanceToggle } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { Student } from '@/types';

type Subject = {
    id: string;
    name: string;
    code: string;
    semester: number;
    departmentId: string;
};

type FacultyProfile = {
    id: string;
    name: string;
    email: string;
    departmentName: string;
    assignedSubjects: Subject[];
};

type AttendanceRecord = {
    studentId: string;
    status: 'present' | 'absent' | null;
};

export default function FacultyDashboard() {
    const { user } = useAuth();
    const [facultyProfile, setFacultyProfile] = useState<FacultyProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [studentList, setStudentList] = useState<Student[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [loadingStudents, setLoadingStudents] = useState(false);

    // Fetch Faculty Profile
    useEffect(() => {
        async function fetchProfile() {
            try {
                const res = await fetch('/api/faculty/me');
                if (res.ok) {
                    const json = await res.json();
                    if (json.success) {
                        setFacultyProfile(json.data);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch profile", error);
            } finally {
                setLoadingProfile(false);
            }
        }
        fetchProfile();
    }, []);

    // Load students when subject changes
    useEffect(() => {
        if (!selectedSubject || !facultyProfile) {
            setStudentList([]);
            setAttendanceRecords([]);
            return;
        }

        async function fetchStudents() {
            setLoadingStudents(true);
            try {
                const subject = facultyProfile?.assignedSubjects.find(s => s.id === selectedSubject);
                if (!subject) return;

                // Fetch students for the subject's department and semester (mock logic often used sem, but here we filter by Dept)
                // Ideally, API should support filtering by Semester too if student has semester field, 
                // or we rely on Department + Year/Sem mapping.
                // For now, let's fetch students by Department and filter or just show all in Dept as per previous logic.
                // Enhanced Logic: Fetch students by Department AND Semester (assuming 'year' in student ~ semester/2)

                // Construct query:
                // Assuming year 1 = sem 1/2, year 2 = sem 3/4, etc. 
                // Let's just fetch by department for now to be safe, or just utilize the API we have.
                const query = new URLSearchParams({
                    departmentId: subject.departmentId,
                    activeOnly: 'true'
                });

                // If possible filter by year: year = Math.ceil(subject.semester / 2)
                const targetYear = Math.ceil(subject.semester / 2);
                query.append('year', targetYear.toString());

                const res = await fetch(`/api/students?${query.toString()}`);
                const json = await res.json();

                if (json.success) {
                    const students: Student[] = json.data;
                    setStudentList(students);
                    // Initialize attendance records
                    setAttendanceRecords(students.map(s => ({ studentId: s.id, status: null })));
                }
            } catch (err) {
                console.error("Failed to fetch students", err);
            } finally {
                setLoadingStudents(false);
            }
        }

        fetchStudents();
        setSubmitMessage(null);
    }, [selectedSubject, facultyProfile]);

    const handleAttendanceChange = (studentId: string, status: 'present' | 'absent') => {
        setAttendanceRecords(prev =>
            prev.map(record =>
                record.studentId === studentId ? { ...record, status } : record
            )
        );
    };

    const markAllPresent = () => {
        setAttendanceRecords(prev =>
            prev.map(record => ({ ...record, status: 'present' }))
        );
    };

    const markAllAbsent = () => {
        setAttendanceRecords(prev =>
            prev.map(record => ({ ...record, status: 'absent' }))
        );
    };

    const handleSubmit = async () => {
        if (!facultyProfile) return;

        // Validate all students have been marked
        const unmarkedCount = attendanceRecords.filter(r => r.status === null).length;
        if (unmarkedCount > 0) {
            setSubmitMessage({
                type: 'error',
                text: `Please mark attendance for all students. ${unmarkedCount} student(s) remaining.`,
            });
            return;
        }

        setIsSubmitting(true);
        setSubmitMessage(null);

        try {
            const response = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subjectId: selectedSubject,
                    date: selectedDate,
                    records: attendanceRecords.map(r => ({
                        studentId: r.studentId,
                        status: r.status,
                    })),
                    // markedBy ID is the FACULTY TABLE ID, not User ID.
                    markedBy: facultyProfile.id,
                }),
            });

            const data = await response.json();

            if (data.success || response.ok) { // API might return 201 without success: true sometimes depending on impl
                setSubmitMessage({
                    type: 'success',
                    text: `Attendance submitted successfully for ${attendanceRecords.length} students!`,
                });
                // Reset form
                setAttendanceRecords(prev => prev.map(r => ({ ...r, status: null })));
            } else {
                setSubmitMessage({
                    type: 'error',
                    text: data.error || 'Failed to submit attendance',
                });
            }
        } catch (error) {
            setSubmitMessage({
                type: 'error',
                text: 'Network error. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
    const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;
    const unmarkedCount = attendanceRecords.filter(r => r.status === null).length;

    if (loadingProfile) {
        return <div className="min-h-screen flex items-center justify-center">Loading dashboard...</div>;
    }

    return (
        <RoleGuard allowedRoles={['FACULTY']}>
            <div className="min-h-screen bg-gray-50">
                <Header title="Faculty Dashboard" />

                <main className="p-6 max-w-7xl mx-auto">
                    {/* Faculty Info */}
                    <Card className="mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold">
                                {facultyProfile?.name.charAt(0) || 'F'}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">{facultyProfile?.name || user?.name}</h2>
                                <p className="text-sm text-gray-500">
                                    {facultyProfile?.departmentName || 'Department'} • {facultyProfile?.assignedSubjects.length || 0} Subjects Assigned
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Assigned Subjects */}
                    <Card title="Your Assigned Subjects" className="mb-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {facultyProfile?.assignedSubjects.map(subject => (
                                <div
                                    key={subject.id}
                                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${selectedSubject === subject.id
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    onClick={() => setSelectedSubject(subject.id)}
                                >
                                    <h3 className="font-semibold text-gray-800">{subject.name}</h3>
                                    <p className="text-sm text-gray-500">{subject.code} • Semester {subject.semester}</p>
                                </div>
                            ))}
                            {facultyProfile?.assignedSubjects.length === 0 && (
                                <p className="text-gray-500 col-span-3">No subjects assigned.</p>
                            )}
                        </div>
                    </Card>

                    {/* Attendance Marking Section */}
                    {selectedSubject && (
                        <Card title="Mark Attendance" className="mb-6">
                            {/* Date Picker and Quick Actions */}
                            <div className="flex flex-wrap items-end gap-4 mb-6 pb-6 border-b border-gray-200">
                                <div className="w-48">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Date
                                    </label>
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="success" size="sm" onClick={markAllPresent} disabled={loadingStudents}>
                                        Mark All Present
                                    </Button>
                                    <Button variant="danger" size="sm" onClick={markAllAbsent} disabled={loadingStudents}>
                                        Mark All Absent
                                    </Button>
                                </div>
                                <div className="ml-auto flex gap-4 text-sm">
                                    <span className="text-green-600 font-medium">Present: {presentCount}</span>
                                    <span className="text-red-600 font-medium">Absent: {absentCount}</span>
                                    <span className="text-gray-500">Unmarked: {unmarkedCount}</span>
                                </div>
                            </div>

                            {/* Student List */}
                            <div className="overflow-x-auto">
                                {loadingStudents ? (
                                    <div className="py-8 text-center text-gray-500">Loading students...</div>
                                ) : studentList.length > 0 ? (
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                    #
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                    Roll Number
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                    Student Name
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                    Section
                                                </th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                    Attendance
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {studentList.map((student, index) => {
                                                const record = attendanceRecords.find(r => r.studentId === student.id);
                                                return (
                                                    <tr key={student.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-4 text-sm text-gray-600">{index + 1}</td>
                                                        <td className="px-4 py-4 text-sm font-medium text-gray-800">
                                                            {student.rollNumber}
                                                        </td>
                                                        <td className="px-4 py-4 text-sm text-gray-700">{student.name}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-600">Section {student.section}</td>
                                                        <td className="px-4 py-4 text-center">
                                                            <AttendanceToggle
                                                                status={record?.status || null}
                                                                onChange={(status) => handleAttendanceChange(student.id, status)}
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="py-8 text-center text-gray-500">No students found for this subject/semester.</div>
                                )}
                            </div>

                            {/* Submit Button */}
                            <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between">
                                {submitMessage && (
                                    <p
                                        className={`text-sm font-medium ${submitMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
                                            }`}
                                    >
                                        {submitMessage.text}
                                    </p>
                                )}
                                <Button
                                    variant="primary"
                                    size="lg"
                                    onClick={handleSubmit}
                                    isLoading={isSubmitting}
                                    disabled={loadingStudents || unmarkedCount > 0 || studentList.length === 0}
                                    className="ml-auto"
                                >
                                    Submit Attendance
                                </Button>
                            </div>
                        </Card>
                    )}

                    {!selectedSubject && (
                        <Card className="text-center py-12">
                            <p className="text-gray-500">Select a subject above to mark attendance</p>
                        </Card>
                    )}
                </main>
            </div>
        </RoleGuard>
    );
}
