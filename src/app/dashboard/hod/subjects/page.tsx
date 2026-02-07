'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header, RoleGuard } from '@/components/layout';
import { Card, Button, PageHeader, Modal, ConfirmationModal } from '@/components/ui';
import Link from 'next/link';

/**
 * HOD Subject Assignment Page
 * 
 * Features:
 * - View all faculty-subject assignments for department
 * - Assign subjects (from own department) to any faculty
 * - Remove assignments
 */

interface Assignment {
    id: string;
    facultyId: string;
    facultyName: string;
    facultyEmail: string;
    facultyDepartment: string;
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    semester: number;
    createdAt: string;
}

interface Subject {
    id: string;
    name: string;
    code: string;
    semester: number;
}

interface Faculty {
    id: string;
    name: string;
    email: string;
    department: string;
}

export default function SubjectAssignmentPage() {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [faculties, setFaculties] = useState<Faculty[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

    // Form state
    const [selectedFaculty, setSelectedFaculty] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Message state
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/hod/subjects/assignments');
            const data = await res.json();

            if (data.success) {
                setAssignments(data.data.assignments);
                setSubjects(data.data.subjects);
                setFaculties(data.data.faculties);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAssign = async () => {
        setFormError('');

        if (!selectedFaculty || !selectedSubject) {
            setFormError('Please select both faculty and subject');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/hod/subjects/assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    facultyId: selectedFaculty,
                    subjectId: selectedSubject
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to assign subject');
            }

            setMessage({ type: 'success', text: 'Subject assigned successfully!' });
            setShowAssignModal(false);
            setSelectedFaculty('');
            setSelectedSubject('');
            fetchData();
        } catch (err: any) {
            setFormError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveAssignment = async () => {
        if (!selectedAssignment) return;

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/hod/subjects/assignments/${selectedAssignment.id}`, {
                method: 'DELETE'
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to remove assignment');
            }

            setMessage({ type: 'success', text: 'Assignment removed successfully!' });
            setShowDeleteModal(false);
            setSelectedAssignment(null);
            fetchData();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const openDeleteModal = (assignment: Assignment) => {
        setSelectedAssignment(assignment);
        setShowDeleteModal(true);
    };

    // Group assignments by semester
    const assignmentsBySemester = assignments.reduce((acc, assignment) => {
        const sem = assignment.semester;
        if (!acc[sem]) acc[sem] = [];
        acc[sem].push(assignment);
        return acc;
    }, {} as Record<number, Assignment[]>);

    return (
        <RoleGuard allowedRoles={['HOD']}>
            <div className="min-h-screen bg-gray-50">
                <Header title="HOD Portal" />

                <main className="p-6 max-w-7xl mx-auto">
                    {/* Breadcrumb */}
                    <div className="mb-4">
                        <Link href="/dashboard/hod" className="text-sm text-blue-600 hover:underline">
                            ← Back to Dashboard
                        </Link>
                    </div>

                    {/* Page Header */}
                    <PageHeader
                        title="Subject Assignment"
                        subtitle="Assign subjects from your department to faculty members"
                    >
                        <Button variant="primary" onClick={() => setShowAssignModal(true)}>
                            + Assign Subject
                        </Button>
                    </PageHeader>

                    {/* Message */}
                    {message && (
                        <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : assignments.length === 0 ? (
                        <Card>
                            <div className="text-center py-12 text-gray-500">
                                <p className="mb-4">No subject assignments yet.</p>
                                <Button variant="primary" onClick={() => setShowAssignModal(true)}>
                                    Make First Assignment
                                </Button>
                            </div>
                        </Card>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(assignmentsBySemester)
                                .sort(([a], [b]) => Number(a) - Number(b))
                                .map(([semester, semAssignments]) => (
                                    <Card key={semester}>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                            Semester {semester}
                                        </h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Subject</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Faculty</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Faculty Dept</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {semAssignments.map(assignment => (
                                                        <tr key={assignment.id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-4 text-sm font-medium text-gray-800">
                                                                {assignment.subjectName}
                                                            </td>
                                                            <td className="px-4 py-4 text-sm text-gray-600">
                                                                {assignment.subjectCode}
                                                            </td>
                                                            <td className="px-4 py-4 text-sm text-gray-600">
                                                                {assignment.facultyName}
                                                            </td>
                                                            <td className="px-4 py-4 text-sm text-gray-500">
                                                                {assignment.facultyDepartment}
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <Button
                                                                    size="sm"
                                                                    variant="danger"
                                                                    onClick={() => openDeleteModal(assignment)}
                                                                >
                                                                    Remove
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>
                                ))}
                        </div>
                    )}
                </main>

                {/* Assign Subject Modal */}
                <Modal
                    isOpen={showAssignModal}
                    onClose={() => setShowAssignModal(false)}
                    title="Assign Subject to Faculty"
                    size="md"
                >
                    <div className="space-y-4">
                        {formError && (
                            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                                {formError}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Subject (from your department) *
                            </label>
                            <select
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select a subject</option>
                                {subjects.map(subject => (
                                    <option key={subject.id} value={subject.id}>
                                        {subject.name} ({subject.code}) - Sem {subject.semester}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Assign to Faculty *
                            </label>
                            <select
                                value={selectedFaculty}
                                onChange={(e) => setSelectedFaculty(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select a faculty</option>
                                {faculties.map(faculty => (
                                    <option key={faculty.id} value={faculty.id}>
                                        {faculty.name} ({faculty.department})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <p className="text-xs text-gray-500">
                            You can assign subjects from your department to faculty from any department.
                        </p>

                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="secondary"
                                className="flex-1"
                                onClick={() => setShowAssignModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                className="flex-1"
                                onClick={handleAssign}
                                isLoading={isSubmitting}
                            >
                                Assign
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Delete Confirmation Modal */}
                <ConfirmationModal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={handleRemoveAssignment}
                    title="Remove Assignment"
                    description={`Are you sure you want to remove ${selectedAssignment?.facultyName} from ${selectedAssignment?.subjectName}?`}
                    confirmText="Remove"
                    variant="danger"
                    isLoading={isSubmitting}
                />
            </div>
        </RoleGuard>
    );
}
