'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header, RoleGuard } from '@/components/layout';
import { Card, Button, Input, Select } from '@/components/ui';

type Classroom = {
    id: string;
    name: string;
    batch: string | null;
    year: number | null;
    semester: number | null;
    studentCount: number;
    sessionCount: number;
};

type Student = {
    id: string;
    name: string;
    email: string;
    rollNumber: string;
    year: number;
    section: string;
};

export default function HODClassroomsPage() {
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [departmentStudents, setDepartmentStudents] = useState<Student[]>([]);
    const [selectedClassroom, setSelectedClassroom] = useState<string | null>(null);
    const [classroomStudents, setClassroomStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddStudentsModal, setShowAddStudentsModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', batch: '', year: '', semester: '' });
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchClassrooms = useCallback(async () => {
        try {
            const res = await fetch('/api/hod/classrooms');
            const data = await res.json();
            if (data.success) setClassrooms(data.data);
        } catch (error) {
            console.error('Error fetching classrooms:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchClassroomStudents = async (classroomId: string) => {
        try {
            const res = await fetch(`/api/hod/classrooms/${classroomId}/students`);
            const data = await res.json();
            if (data.success) setClassroomStudents(data.data);
        } catch (error) {
            console.error('Error fetching students:', error);
        }
    };

    const fetchDepartmentStudents = async () => {
        try {
            const res = await fetch('/api/students?activeOnly=true');
            const data = await res.json();
            if (data.success) setDepartmentStudents(data.data);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    useEffect(() => {
        fetchClassrooms();
        fetchDepartmentStudents();
    }, [fetchClassrooms]);

    useEffect(() => {
        if (selectedClassroom) {
            fetchClassroomStudents(selectedClassroom);
        } else {
            setClassroomStudents([]);
        }
    }, [selectedClassroom]);

    const handleCreateClassroom = async () => {
        try {
            const res = await fetch('/api/hod/classrooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: 'Classroom created!' });
                setShowCreateModal(false);
                setFormData({ name: '', batch: '', year: '', semester: '' });
                fetchClassrooms();
            } else {
                setMessage({ type: 'error', text: data.error });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to create classroom' });
        }
        setTimeout(() => setMessage(null), 3000);
    };

    const handleDeleteClassroom = async (id: string) => {
        if (!confirm('Are you sure you want to delete this classroom?')) return;
        try {
            const res = await fetch(`/api/hod/classrooms/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setMessage({ type: 'success', text: 'Classroom deleted' });
                fetchClassrooms();
                if (selectedClassroom === id) setSelectedClassroom(null);
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to delete' });
        }
        setTimeout(() => setMessage(null), 3000);
    };

    const handleAddStudents = async () => {
        if (!selectedClassroom || selectedStudentIds.length === 0) return;
        try {
            const res = await fetch(`/api/hod/classrooms/${selectedClassroom}/students`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentIds: selectedStudentIds }),
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: `Added ${data.added} student(s)` });
                setShowAddStudentsModal(false);
                setSelectedStudentIds([]);
                fetchClassroomStudents(selectedClassroom);
                fetchClassrooms();
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to add students' });
        }
        setTimeout(() => setMessage(null), 3000);
    };

    const handleRemoveStudent = async (studentId: string) => {
        if (!selectedClassroom) return;
        try {
            const res = await fetch(`/api/hod/classrooms/${selectedClassroom}/students`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentIds: [studentId] }),
            });
            if (res.ok) {
                setMessage({ type: 'success', text: 'Student removed' });
                fetchClassroomStudents(selectedClassroom);
                fetchClassrooms();
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to remove student' });
        }
        setTimeout(() => setMessage(null), 3000);
    };

    const existingStudentIds = new Set(classroomStudents.map(s => s.id));
    const availableStudents = departmentStudents.filter(s => !existingStudentIds.has(s.id));

    return (
        <RoleGuard allowedRoles={['HOD']}>
            <div className="min-h-screen bg-gray-50">
                <Header title="Classroom Management" />

                <main className="p-6 max-w-7xl mx-auto">
                    {message && (
                        <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Classrooms List */}
                        <Card title="Classrooms">
                            <div className="mb-4">
                                <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                                    + Create Classroom
                                </Button>
                            </div>
                            {loading ? (
                                <p className="text-center py-8 text-gray-500">Loading...</p>
                            ) : classrooms.length > 0 ? (
                                <div className="space-y-3">
                                    {classrooms.map(classroom => (
                                        <div
                                            key={classroom.id}
                                            onClick={() => setSelectedClassroom(classroom.id)}
                                            className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedClassroom === classroom.id
                                                    ? 'border-purple-500 bg-purple-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-semibold text-gray-800">{classroom.name}</h4>
                                                    <p className="text-sm text-gray-500">
                                                        {classroom.studentCount} students • {classroom.sessionCount} sessions
                                                    </p>
                                                    {classroom.batch && <p className="text-xs text-gray-400">Batch: {classroom.batch}</p>}
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="danger"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteClassroom(classroom.id); }}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-8">No classrooms created yet</p>
                            )}
                        </Card>

                        {/* Classroom Students */}
                        <Card title={selectedClassroom ? 'Students in Classroom' : 'Select a Classroom'}>
                            {selectedClassroom ? (
                                <>
                                    <div className="mb-4">
                                        <Button variant="secondary" onClick={() => setShowAddStudentsModal(true)}>
                                            + Add Students
                                        </Button>
                                    </div>
                                    {classroomStudents.length > 0 ? (
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                            {classroomStudents.map(student => (
                                                <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                    <div>
                                                        <p className="font-medium text-gray-800">{student.name}</p>
                                                        <p className="text-sm text-gray-500">{student.rollNumber} • Year {student.year}</p>
                                                    </div>
                                                    <Button size="sm" variant="ghost" onClick={() => handleRemoveStudent(student.id)}>
                                                        Remove
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-center py-8">No students in this classroom</p>
                                    )}
                                </>
                            ) : (
                                <p className="text-gray-500 text-center py-8">Select a classroom to view students</p>
                            )}
                        </Card>
                    </div>
                </main>

                {/* Create Classroom Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Create Classroom</h3>
                            <div className="space-y-4">
                                <Input
                                    label="Classroom Name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., CSE-A 2nd Year"
                                />
                                <Input
                                    label="Batch (Optional)"
                                    value={formData.batch}
                                    onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                                    placeholder="e.g., 2023-2027"
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Year"
                                        type="number"
                                        min="1"
                                        max="4"
                                        value={formData.year}
                                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                    />
                                    <Input
                                        label="Semester"
                                        type="number"
                                        min="1"
                                        max="8"
                                        value={formData.semester}
                                        onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <Button variant="secondary" className="flex-1" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </Button>
                                <Button variant="primary" className="flex-1" onClick={handleCreateClassroom}>
                                    Create
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Students Modal */}
                {showAddStudentsModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 mx-4">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Add Students</h3>
                            <div className="max-h-[400px] overflow-y-auto border rounded-lg">
                                {availableStudents.length > 0 ? (
                                    availableStudents.map(student => (
                                        <label key={student.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                                            <input
                                                type="checkbox"
                                                checked={selectedStudentIds.includes(student.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedStudentIds([...selectedStudentIds, student.id]);
                                                    } else {
                                                        setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.id));
                                                    }
                                                }}
                                                className="rounded text-purple-600"
                                            />
                                            <div>
                                                <p className="font-medium text-gray-800">{student.name}</p>
                                                <p className="text-sm text-gray-500">{student.rollNumber} • Year {student.year}</p>
                                            </div>
                                        </label>
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-center py-8">No available students</p>
                                )}
                            </div>
                            <div className="flex gap-3 mt-6">
                                <Button variant="secondary" className="flex-1" onClick={() => { setShowAddStudentsModal(false); setSelectedStudentIds([]); }}>
                                    Cancel
                                </Button>
                                <Button variant="primary" className="flex-1" onClick={handleAddStudents} disabled={selectedStudentIds.length === 0}>
                                    Add {selectedStudentIds.length} Student(s)
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
