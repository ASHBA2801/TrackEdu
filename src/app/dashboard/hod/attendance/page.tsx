'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header, RoleGuard } from '@/components/layout';
import { Card, Button, Select, Input } from '@/components/ui';

type AttendanceSession = {
    id: string;
    date: string;
    subject: { id: string; name: string; code: string };
    faculty: { id: string; name: string };
    classroom: { id: string; name: string } | null;
    status: string;
    attendanceSummary: {
        total: number;
        present: number;
        absent: number;
        leave: number;
    };
    attendance: {
        studentId: string;
        studentName: string;
        rollNumber: string;
        status: string;
    }[];
};

type Classroom = { id: string; name: string };
type Subject = { id: string; name: string; code: string };

export default function HODAttendancePage() {
    const [sessions, setSessions] = useState<AttendanceSession[]>([]);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);

    // Filters
    const [classroomFilter, setClassroomFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (classroomFilter) params.append('classroomId', classroomFilter);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const [sessionsRes, classroomsRes] = await Promise.all([
                fetch(`/api/hod/attendance?${params.toString()}`),
                fetch('/api/hod/classrooms'),
            ]);

            const sessionsData = await sessionsRes.json();
            const classroomsData = await classroomsRes.json();

            if (sessionsData.success) setSessions(sessionsData.data);
            if (classroomsData.success) setClassrooms(classroomsData.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [classroomFilter, startDate, endDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <RoleGuard allowedRoles={['HOD']}>
            <div className="min-h-screen bg-gray-50">
                <Header title="Attendance Reports" />

                <main className="p-6 max-w-7xl mx-auto">
                    {/* Filters */}
                    <Card className="mb-6">
                        <div className="flex flex-wrap gap-4 items-end">
                            <div className="w-48">
                                <Select
                                    label="Classroom"
                                    value={classroomFilter}
                                    onChange={(e) => setClassroomFilter(e.target.value)}
                                    options={[
                                        { value: '', label: 'All Classrooms' },
                                        ...classrooms.map(c => ({ value: c.id, label: c.name })),
                                    ]}
                                />
                            </div>
                            <div className="w-40">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                />
                            </div>
                            <div className="w-40">
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                />
                            </div>
                            <Button variant="secondary" onClick={() => { setClassroomFilter(''); setStartDate(''); setEndDate(''); }}>
                                Clear Filters
                            </Button>
                        </div>
                    </Card>

                    {/* Sessions List */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card title="Class Sessions">
                            {loading ? (
                                <div className="py-8 text-center text-gray-500">Loading...</div>
                            ) : sessions.length > 0 ? (
                                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                                    {sessions.map(session => (
                                        <div
                                            key={session.id}
                                            onClick={() => setSelectedSession(session)}
                                            className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedSession?.id === session.id
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-semibold text-gray-800">{session.subject.name}</h4>
                                                    <p className="text-sm text-gray-500">
                                                        {new Date(session.date).toLocaleDateString()} • {session.faculty.name}
                                                    </p>
                                                    {session.classroom && (
                                                        <p className="text-xs text-gray-400">{session.classroom.name}</p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-green-600 font-medium">{session.attendanceSummary.present}</span>
                                                    <span className="text-gray-400 mx-1">/</span>
                                                    <span className="text-gray-600">{session.attendanceSummary.total}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-8">No sessions found</p>
                            )}
                        </Card>

                        {/* Session Details */}
                        <Card title={selectedSession ? `Attendance: ${selectedSession.subject.name}` : 'Session Details'}>
                            {selectedSession ? (
                                <div>
                                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                        <div className="grid grid-cols-4 gap-2 text-center">
                                            <div>
                                                <p className="text-2xl font-bold text-gray-800">{selectedSession.attendanceSummary.total}</p>
                                                <p className="text-xs text-gray-500">Total</p>
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold text-green-600">{selectedSession.attendanceSummary.present}</p>
                                                <p className="text-xs text-gray-500">Present</p>
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold text-red-600">{selectedSession.attendanceSummary.absent}</p>
                                                <p className="text-xs text-gray-500">Absent</p>
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold text-yellow-600">{selectedSession.attendanceSummary.leave}</p>
                                                <p className="text-xs text-gray-500">Leave</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Roll No</th>
                                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Name</th>
                                                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {selectedSession.attendance.map(a => (
                                                    <tr key={a.studentId} className="hover:bg-gray-50">
                                                        <td className="px-3 py-2 font-medium">{a.rollNumber}</td>
                                                        <td className="px-3 py-2">{a.studentName}</td>
                                                        <td className="px-3 py-2 text-center">
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.status === 'PRESENT' ? 'bg-green-100 text-green-700' :
                                                                    a.status === 'LEAVE' ? 'bg-yellow-100 text-yellow-700' :
                                                                        'bg-red-100 text-red-700'
                                                                }`}>
                                                                {a.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-8">Select a session to view details</p>
                            )}
                        </Card>
                    </div>
                </main>
            </div>
        </RoleGuard>
    );
}
