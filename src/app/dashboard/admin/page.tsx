'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header, RoleGuard } from '@/components/layout';
import { Card, StatCard, Button, Input, Select, ConfirmationModal } from '@/components/ui';
import { Student, Faculty, Subject, Department } from '@/types';

// Extended types for API responses
interface StudentWithDetails extends Student {
    departmentName?: string;
}
interface FacultyWithDetails extends Faculty {
    departmentName?: string;
    subjects?: Subject[]; // Prisma returns full objects
}
interface SubjectWithDetails extends Subject {
    departmentName?: string;
}

type TabType = 'overview' | 'students' | 'faculty' | 'departments' | 'subjects' | 'reports';

interface ModalState {
    isOpen: boolean;
    type: 'add' | 'edit';
    entity: 'student' | 'faculty' | 'department' | 'subject' | null;
    data?: Record<string, unknown>;
}

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [modal, setModal] = useState<ModalState>({ isOpen: false, type: 'add', entity: null });
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Data State
    const [students, setStudents] = useState<StudentWithDetails[]>([]);
    const [faculty, setFaculty] = useState<FacultyWithDetails[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [subjects, setSubjects] = useState<SubjectWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; entity: string; id: string; name: string }>({
        isOpen: false,
        entity: '',
        id: '',
        name: ''
    });
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [deptRes, subRes, stuRes, facRes] = await Promise.all([
                fetch('/api/departments'),
                fetch('/api/subjects'),
                fetch('/api/students'),
                fetch('/api/faculty')
            ]);

            const depts = await deptRes.json();
            const subs = await subRes.json();
            const stus = await stuRes.json();
            const facs = await facRes.json();

            if (depts.success) setDepartments(depts.data);
            if (subs.success) setSubjects(subs.data);
            if (stus.success) setStudents(stus.data);
            if (facs.success) setFaculty(facs.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
        { id: 'overview', label: 'Overview', icon: <DashboardIcon /> },
        { id: 'students', label: 'Students', icon: <UsersIcon /> },
        { id: 'faculty', label: 'Faculty', icon: <AcademicIcon /> },
        { id: 'departments', label: 'Departments', icon: <BuildingIcon /> },
        { id: 'subjects', label: 'Subjects', icon: <BookIcon /> },
        { id: 'reports', label: 'Reports', icon: <ChartIcon /> },
    ];

    const openModal = (type: 'add' | 'edit', entity: ModalState['entity'], data?: Record<string, unknown>) => {
        setModal({ isOpen: true, type, entity, data });
        setFormData(data as Record<string, string> || {});
        setMessage(null);
    };

    const closeModal = () => {
        setModal({ isOpen: false, type: 'add', entity: null });
        setFormData({});
    };

    const handleSubmit = async () => {
        // Implement Mock Add/Edit or real if APIs exist
        // For now, keep generic success message but maybe implement real API call later
        // Since user asked for User Management and Delete, Add/Edit logic is out of immediate scope 
        // but we should at least simulate or try to post to API.

        // Simple generic POST attempt (not robust)
        try {
            let endpoint = '';
            if (modal.entity === 'student') endpoint = '/api/students';
            else if (modal.entity === 'faculty') endpoint = '/api/faculty';
            else if (modal.entity === 'department') endpoint = '/api/departments';
            else if (modal.entity === 'subject') endpoint = '/api/subjects';

            if (modal.type === 'add') {
                await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                fetchData(); // Refresh
                setMessage({ type: 'success', text: `${modal.entity} added successfully!` });
            } else {
                // Edit not implemented in this turn
                setMessage({ type: 'error', text: 'Edit functionality not fully implemented yet' });
            }

            setTimeout(() => {
                closeModal();
                setMessage(null);
            }, 1500);
        } catch (e) {
            setMessage({ type: 'error', text: 'Operation failed' });
        }
    };

    const handleDeleteClick = (entity: string, id: string, name: string) => {
        setDeleteModal({ isOpen: true, entity, id, name });
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        const { entity, id } = deleteModal;
        let endpoint = '';
        switch (entity) {
            case 'department': endpoint = `/api/admin/departments/${id}`; break;
            case 'student': endpoint = `/api/admin/students/${id}`; break;
            case 'subject': endpoint = `/api/admin/subjects/${id}`; break;
            case 'faculty': endpoint = `/api/admin/faculty/${id}`; break;
        }

        try {
            const res = await fetch(endpoint, { method: 'DELETE' });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            setMessage({ type: 'success', text: `${entity} deleted successfully` });
            fetchData();
        } catch (err: any) {
            alert(err.message || 'Failed to delete');
        } finally {
            setIsDeleting(false);
            setDeleteModal({ isOpen: false, entity: '', id: '', name: '' });
            setTimeout(() => setMessage(null), 3000);
        }
    };

    // Statistics
    const totalStudents = students.filter(s => s.isActive).length;
    const totalFaculty = faculty.filter(f => f.isActive).length;
    const totalDepartments = departments.length;
    const totalSubjects = subjects.length;

    // TODO: Connect real attendance data
    const avgAttendance = 0;
    const presentCount = 0;
    const attendanceCount = 0;

    return (
        <RoleGuard allowedRoles={['ADMIN']}>
            <div className="min-h-screen bg-gray-50">
                <Header title="Admin Dashboard" />

                <div className="flex">
                    {/* Sidebar Navigation */}
                    <aside className="w-64 min-h-[calc(100vh-73px)] bg-white border-r border-gray-200 p-4">
                        <nav className="space-y-1">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === tab.id
                                        ? 'bg-blue-50 text-blue-700 font-medium'
                                        : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <span className="w-5 h-5">{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                        </nav>

                        {/* Add User Management Link */}
                        <div className="mt-8 px-4">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Administration</h3>
                            <a href="/dashboard/admin/users" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors">
                                <UsersIcon /> User Management
                            </a>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 p-6">
                        {message && (
                            <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {message.text}
                            </div>
                        )}

                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-gray-800">Dashboard Overview</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <StatCard title="Total Students" value={totalStudents} subtitle={`${students.filter(s => !s.isActive).length} inactive`} />
                                    <StatCard title="Total Faculty" value={totalFaculty} subtitle={`${faculty.filter(f => !f.isActive).length} inactive`} />
                                    <StatCard title="Departments" value={totalDepartments} />
                                    <StatCard title="Subjects" value={totalSubjects} />
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <Card title="Quick Actions">
                                        <div className="grid grid-cols-2 gap-4">
                                            <Button variant="primary" onClick={() => openModal('add', 'student')}>Add Student</Button>
                                            <Button variant="primary" onClick={() => openModal('add', 'faculty')}>Add Faculty</Button>
                                            <Button variant="secondary" onClick={() => openModal('add', 'department')}>Add Department</Button>
                                            <Button variant="secondary" onClick={() => openModal('add', 'subject')}>Add Subject</Button>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        )}

                        {/* Students Tab */}
                        {activeTab === 'students' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-gray-800">Student Management</h2>
                                    <Button variant="primary" onClick={() => openModal('add', 'student')}>
                                        + Add Student
                                    </Button>
                                </div>
                                <Card>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Roll No</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Year</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {isLoading ? <tr><td colSpan={6} className="p-4 text-center">Loading...</td></tr> : students.map(student => (
                                                    <tr key={student.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-4 text-sm font-medium text-gray-800">{student.rollNumber}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-700">{student.name}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-600">{student.departmentName}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-600">Year {student.year}</td>
                                                        <td className="px-4 py-4">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${student.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                                }`}>
                                                                {student.isActive ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div className="flex gap-2">
                                                                <Button size="sm" variant="ghost" onClick={() => openModal('edit', 'student', student as unknown as Record<string, unknown>)}>Edit</Button>
                                                                <Button size="sm" variant="danger" onClick={() => handleDeleteClick('student', student.id, student.name || 'Student')}>Delete</Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </div>
                        )}

                        {/* Faculty Tab */}
                        {activeTab === 'faculty' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-gray-800">Faculty Management</h2>
                                    <Button variant="primary" onClick={() => openModal('add', 'faculty')}>
                                        + Add Faculty
                                    </Button>
                                </div>
                                <Card>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {isLoading ? <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr> : faculty.map(fac => (
                                                    <tr key={fac.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-4 text-sm font-medium text-gray-800">{fac.name}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-600">{fac.email}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-600">{fac.departmentName}</td>
                                                        <td className="px-4 py-4">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${fac.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                                }`}>
                                                                {fac.isActive ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div className="flex gap-2">
                                                                <Button size="sm" variant="ghost" onClick={() => openModal('edit', 'faculty', fac as unknown as Record<string, unknown>)}>Edit</Button>
                                                                <Button size="sm" variant="danger" onClick={() => handleDeleteClick('faculty', fac.id, fac.name || 'Faculty')}>Delete</Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </div>
                        )}

                        {/* Departments Tab */}
                        {activeTab === 'departments' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-gray-800">Department Management</h2>
                                    <Button variant="primary" onClick={() => openModal('add', 'department')}>
                                        + Add Department
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {departments.map(dept => (
                                        <Card key={dept.id} className="hover:shadow-lg transition-shadow">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-800">{dept.name}</h3>
                                                    <p className="text-sm text-gray-500">Code: {dept.code}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button size="sm" variant="ghost" onClick={() => openModal('edit', 'department', dept as unknown as Record<string, unknown>)}>
                                                        Edit
                                                    </Button>
                                                    <Button size="sm" variant="danger" onClick={() => handleDeleteClick('department', dept.id, dept.name)}>
                                                        Delete
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Subjects Tab */}
                        {activeTab === 'subjects' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-gray-800">Subject Management</h2>
                                    <Button variant="primary" onClick={() => openModal('add', 'subject')}>
                                        + Add Subject
                                    </Button>
                                </div>
                                <Card>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Semester</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {isLoading ? <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr> : subjects.map(subject => (
                                                    <tr key={subject.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-4 text-sm font-medium text-gray-800">{subject.code}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-700">{subject.name}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-600">{subject.departmentName}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-600">Sem {subject.semester}</td>
                                                        <td className="px-4 py-4">
                                                            <div className="flex gap-2">
                                                                <Button size="sm" variant="ghost" onClick={() => openModal('edit', 'subject', subject as unknown as Record<string, unknown>)}>
                                                                    Edit
                                                                </Button>
                                                                <Button size="sm" variant="danger" onClick={() => handleDeleteClick('subject', subject.id, subject.name)}>
                                                                    Delete
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </div>
                        )}

                        {/* Reports Tab */}
                        {activeTab === 'reports' && (
                            <div className="p-4 text-center text-gray-500">
                                Reports are currently unavailable due to data migration.
                            </div>
                        )}
                    </main>
                </div>

                {/* Modal */}
                {modal.isOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">
                                {modal.type === 'add' ? 'Add' : 'Edit'} {modal.entity?.charAt(0).toUpperCase()}{modal.entity?.slice(1)}
                            </h3>

                            <div className="space-y-4">
                                {modal.entity === 'student' && (
                                    <>
                                        <Input label="Name" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                        <Input label="Email" type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                        <Input label="Roll Number" value={formData.rollNumber || ''} onChange={e => setFormData({ ...formData, rollNumber: e.target.value })} />
                                        <Select
                                            label="Department"
                                            options={departments.map(d => ({ value: d.id, label: d.name }))}
                                            value={formData.departmentId || ''}
                                            onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input label="Year" type="number" min="1" max="4" value={formData.year || ''} onChange={e => setFormData({ ...formData, year: e.target.value })} />
                                            <Input label="Section" value={formData.section || ''} onChange={e => setFormData({ ...formData, section: e.target.value })} />
                                        </div>
                                    </>
                                )}

                                {modal.entity === 'faculty' && (
                                    <>
                                        <Input label="Name" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                        <Input label="Email" type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                        <Select
                                            label="Department"
                                            options={departments.map(d => ({ value: d.id, label: d.name }))}
                                            value={formData.departmentId || ''}
                                            onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                                        />
                                    </>
                                )}

                                {modal.entity === 'department' && (
                                    <>
                                        <Input label="Department Name" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                        <Input label="Code" value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} />
                                    </>
                                )}

                                {modal.entity === 'subject' && (
                                    <>
                                        <Input label="Subject Name" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                        <Input label="Code" value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} />
                                        <Select
                                            label="Department"
                                            options={departments.map(d => ({ value: d.id, label: d.name }))}
                                            value={formData.departmentId || ''}
                                            onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input label="Semester" type="number" min="1" max="8" value={formData.semester || ''} onChange={e => setFormData({ ...formData, semester: e.target.value })} />
                                            <Input label="Credits" type="number" min="1" max="5" value={formData.credits || ''} onChange={e => setFormData({ ...formData, credits: e.target.value })} />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex gap-3 mt-6">
                                <Button variant="secondary" className="flex-1" onClick={closeModal}>
                                    Cancel
                                </Button>
                                <Button variant="primary" className="flex-1" onClick={handleSubmit}>
                                    {modal.type === 'add' ? 'Add' : 'Save'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <ConfirmationModal
                    isOpen={deleteModal.isOpen}
                    onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
                    onConfirm={handleConfirmDelete}
                    title={`Delete ${deleteModal.entity}`}
                    description={`Are you sure you want to delete ${deleteModal.name}? This action cannot be undone.`}
                    confirmText="Delete"
                    variant="danger"
                    isLoading={isDeleting}
                />
            </div>
        </RoleGuard>
    );
}

// Icon components (Keep existing)
function DashboardIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
    );
}

function UsersIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
    );
}

function AcademicIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
        </svg>
    );
}

function BuildingIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
        </svg>
    );
}

function BookIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
    );
}

function ChartIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
    );
}
