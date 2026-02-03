'use client';

import { useEffect, useState } from 'react';
import { Header, RoleGuard } from '@/components/layout';
import { ProfileCard, StatCard, SimpleTable, Card } from '@/components/ui';
import {
    students,
    timetable,
    getStudentById,
    getDepartmentById,
    calculateAttendancePercentage
} from '@/lib/mock-data';
import { useAuth } from '@/context/AuthContext';
import { AttendanceSummary } from '@/types';

export default function StudentDashboard() {
    const { user } = useAuth();
    const [attendanceData, setAttendanceData] = useState<{
        subjects: AttendanceSummary[];
        overall: { totalClasses: number; attended: number; percentage: number };
    } | null>(null);
    const [loading, setLoading] = useState(true);

    // Get student data (using mock student for demo)
    const studentId = user?.roleId || 'stu-1';
    const student = getStudentById(studentId);
    const department = student ? getDepartmentById(student.departmentId) : null;

    useEffect(() => {
        // Fetch attendance summary
        const fetchAttendance = async () => {
            try {
                const res = await fetch(`/api/attendance?studentId=${studentId}&summary=true`);
                const data = await res.json();
                if (data.success) {
                    setAttendanceData(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch attendance:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAttendance();
    }, [studentId]);

    const getAttendanceColor = (percentage: number) => {
        if (percentage >= 75) return 'text-green-600';
        if (percentage >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getAttendanceBg = (percentage: number) => {
        if (percentage >= 75) return 'bg-green-100';
        if (percentage >= 60) return 'bg-yellow-100';
        return 'bg-red-100';
    };

    return (
        <RoleGuard allowedRoles={['STUDENT']}>
            <div className="min-h-screen bg-gray-50">
                <Header title="Student Dashboard" />

                <main className="p-6 max-w-7xl mx-auto">
                    {/* Profile and Stats Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Profile Card */}
                        {student && (
                            <ProfileCard
                                name={student.name}
                                subtitle={student.email}
                                details={[
                                    { label: 'Roll Number', value: student.rollNumber },
                                    { label: 'Department', value: department?.name || 'N/A' },
                                    { label: 'Year', value: `${student.year}${student.year === 1 ? 'st' : student.year === 2 ? 'nd' : student.year === 3 ? 'rd' : 'th'} Year` },
                                    { label: 'Section', value: `Section ${student.section}` },
                                ]}
                                className="lg:col-span-1"
                            />
                        )}

                        {/* Overall Attendance Card */}
                        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <StatCard
                                title="Overall Attendance"
                                value={loading ? '...' : `${attendanceData?.overall.percentage || 0}%`}
                                subtitle={loading ? 'Loading...' : `${attendanceData?.overall.attended || 0} of ${attendanceData?.overall.totalClasses || 0} classes`}
                                trend={
                                    !loading && attendanceData?.overall.percentage
                                        ? attendanceData.overall.percentage >= 75
                                            ? 'up'
                                            : attendanceData.overall.percentage >= 60
                                                ? 'neutral'
                                                : 'down'
                                        : 'neutral'
                                }
                            />
                            <StatCard
                                title="Total Subjects"
                                value={loading ? '...' : attendanceData?.subjects.length || 0}
                                subtitle="Currently enrolled"
                            />
                            <StatCard
                                title="Classes This Week"
                                value="20"
                                subtitle="5 days schedule"
                            />
                            <StatCard
                                title="Status"
                                value={
                                    !loading && attendanceData?.overall.percentage && attendanceData.overall.percentage >= 75
                                        ? 'Good'
                                        : !loading && attendanceData?.overall.percentage && attendanceData.overall.percentage >= 60
                                            ? 'Warning'
                                            : 'Critical'
                                }
                                subtitle={
                                    !loading && attendanceData?.overall.percentage && attendanceData.overall.percentage >= 75
                                        ? 'Keep it up!'
                                        : 'Improve attendance'
                                }
                            />
                        </div>
                    </div>

                    {/* Subject-wise Attendance */}
                    <Card title="Subject-wise Attendance" className="mb-8">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : (
                            <SimpleTable
                                headers={['Subject', 'Code', 'Classes Held', 'Attended', 'Percentage']}
                                rows={
                                    attendanceData?.subjects.map(subject => [
                                        subject.subjectName,
                                        subject.subjectId,
                                        subject.totalClasses.toString(),
                                        subject.attended.toString(),
                                        <span
                                            key={subject.subjectId}
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getAttendanceBg(subject.percentage)} ${getAttendanceColor(subject.percentage)}`}
                                        >
                                            {subject.percentage}%
                                        </span>,
                                    ]) || []
                                }
                            />
                        )}
                    </Card>

                    {/* Timetable */}
                    <Card title="Weekly Timetable">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Day
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Period 1
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Period 2
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Period 3
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Period 4
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {timetable.map((day, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-4 py-4 text-sm font-medium text-gray-800">
                                                {day.day}
                                            </td>
                                            {day.periods.map((period, pIndex) => (
                                                <td key={pIndex} className="px-4 py-4">
                                                    <div className="text-sm font-medium text-gray-700">
                                                        {period.subjectName}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{period.time}</div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </main>
            </div>
        </RoleGuard>
    );
}
