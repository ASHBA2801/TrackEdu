
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Card, Select } from '@/components/ui';
import { QRCodeSVG } from 'qrcode.react';
import { Play, Square, QrCode, XCircle, RefreshCw, Users } from 'lucide-react';

type Session = {
    id: string;
    status: 'ACTIVE' | 'COMPLETED';
    qrEnabled: boolean;
    currentQrCode: string | null;
    currentQrExpiresAt: string | null;
    classroomId?: string;
    classroomName?: string;
};

type Classroom = {
    id: string;
    name: string;
    studentCount: number;
};

interface SessionControlProps {
    subjectId: string;
    facultyId: string;
    departmentId: string;
}

export default function SessionControl({ subjectId, facultyId, departmentId }: SessionControlProps) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const pollInterval = useRef<NodeJS.Timeout | null>(null);

    // New state for classroom selection
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [selectedClassroom, setSelectedClassroom] = useState<string>('');
    const [loadingClassrooms, setLoadingClassrooms] = useState(true);
    const [showClassroomSelect, setShowClassroomSelect] = useState(false);

    // Fetch classrooms for the department
    const fetchClassrooms = useCallback(async () => {
        setLoadingClassrooms(true);
        try {
            const res = await fetch(`/api/faculty/classrooms?departmentId=${departmentId}`);
            const data = await res.json();
            if (data.success) {
                setClassrooms(data.data);
            }
        } catch (error) {
            console.error('Error fetching classrooms:', error);
        } finally {
            setLoadingClassrooms(false);
        }
    }, [departmentId]);

    useEffect(() => {
        if (departmentId) {
            fetchClassrooms();
        }
    }, [departmentId, fetchClassrooms]);

    // Poll for QR updates if enabled
    useEffect(() => {
        if (session?.qrEnabled && session.status === 'ACTIVE') {
            const fetchQr = async () => {
                try {
                    const res = await fetch(`/api/faculty/sessions/${session.id}/qr`);
                    const data = await res.json();
                    if (data.code) {
                        setQrCode(data.code);
                        // Calculate time left
                        const expires = new Date(data.expiresAt).getTime();
                        const now = new Date().getTime();
                        setTimeLeft(Math.max(0, Math.ceil((expires - now) / 1000)));
                    }
                } catch (e) {
                    console.error(e);
                }
            };

            fetchQr(); // Initial fetch
            pollInterval.current = setInterval(fetchQr, 3000); // Poll every 3s
        } else {
            if (pollInterval.current) clearInterval(pollInterval.current);
            setQrCode(null);
            setTimeLeft(0);
        }

        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, [session?.qrEnabled, session?.status, session?.id]);

    // Countdown timer effect
    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
            return () => clearInterval(timer);
        }
    }, [timeLeft]);

    const startSession = async () => {
        if (!selectedClassroom) {
            alert('Please select a classroom first');
            return;
        }

        setLoading(true);
        try {
            // Get location if possible
            let lat, lng;
            if (navigator.geolocation) {
                try {
                    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                    });
                    lat = pos.coords.latitude;
                    lng = pos.coords.longitude;
                } catch (e) {
                    console.warn("Location not available");
                }
            }

            const res = await fetch('/api/faculty/sessions/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    facultyId,
                    subjectId,
                    classroomId: selectedClassroom,
                    latitude: lat,
                    longitude: lng,
                }),
            });
            const data = await res.json();
            if (data.error) {
                alert(data.error);
                return;
            }
            setSession(data);
            setShowClassroomSelect(false);
        } catch (e) {
            alert("Failed to start session");
        } finally {
            setLoading(false);
        }
    };

    const endSession = async () => {
        if (!session) return;
        if (!confirm("Are you sure you want to end the session? Attendance will be finalized.")) return;
        setLoading(true);
        try {
            await fetch(`/api/faculty/sessions/${session.id}/end`, { method: 'POST' });
            setSession(null);
            setQrCode(null);
            setSelectedClassroom('');
            alert("Session ended. Attendance finalized.");
        } catch (e) {
            alert("Failed to end session");
        } finally {
            setLoading(false);
        }
    };

    const toggleQr = async () => {
        if (!session) return;
        const action = session.qrEnabled ? 'disable' : 'enable';
        setLoading(true);
        try {
            const res = await fetch(`/api/faculty/sessions/${session.id}/qr/${action}`, { method: 'POST' });
            if (res.ok) {
                setSession(prev => prev ? { ...prev, qrEnabled: action === 'enable' } : null);
                if (action === 'enable') {
                    const data = await res.json();
                    setQrCode(data.code);
                    setTimeLeft(15);
                }
            }
        } catch (e) {
            alert(`Failed to ${action} QR`);
        } finally {
            setLoading(false);
        }
    };

    const selectedClassroomData = classrooms.find(c => c.id === selectedClassroom);

    if (!session) {
        return (
            <Card className="p-6 mb-6 bg-white shadow-sm border border-gray-200">
                {!showClassroomSelect ? (
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800">Class Session</h3>
                            <p className="text-gray-500 text-sm">Start a live session to take automatic attendance.</p>
                        </div>
                        <Button onClick={() => setShowClassroomSelect(true)} className="bg-green-600 hover:bg-green-700 text-white flex gap-2">
                            <Play size={16} /> Start Class
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-800">Select Classroom</h3>
                            <button onClick={() => setShowClassroomSelect(false)} className="text-gray-400 hover:text-gray-600">
                                <XCircle size={20} />
                            </button>
                        </div>

                        {loadingClassrooms ? (
                            <div className="text-center py-4 text-gray-500">Loading classrooms...</div>
                        ) : classrooms.length > 0 ? (
                            <>
                                <Select
                                    label="Choose a classroom for this session"
                                    value={selectedClassroom}
                                    onChange={(e) => setSelectedClassroom(e.target.value)}
                                    options={[
                                        { value: '', label: 'Select classroom...' },
                                        ...classrooms.map(c => ({
                                            value: c.id,
                                            label: `${c.name} (${c.studentCount} students)`,
                                        })),
                                    ]}
                                />

                                {selectedClassroomData && (
                                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-blue-700">
                                        <Users size={16} />
                                        <span className="text-sm">
                                            {selectedClassroomData.studentCount} students will be marked for attendance
                                        </span>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <Button
                                        variant="secondary"
                                        onClick={() => setShowClassroomSelect(false)}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={startSession}
                                        isLoading={loading}
                                        disabled={!selectedClassroom}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        Start Session
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-gray-500 mb-2">No classrooms available for your department.</p>
                                <p className="text-sm text-gray-400">Please contact your HOD to create classrooms.</p>
                            </div>
                        )}
                    </div>
                )}
            </Card>
        );
    }

    return (
        <Card className="p-6 mb-6 bg-white shadow-md border-l-4 border-l-blue-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        <h3 className="text-lg font-bold text-gray-800">Live Session Active</h3>
                    </div>
                    <p className="text-gray-500 text-sm">Session ID: {session.id.slice(-6)}</p>
                    {session.classroomName && (
                        <p className="text-gray-600 text-sm mt-1">
                            <Users size={14} className="inline mr-1" />
                            Classroom: {session.classroomName}
                        </p>
                    )}
                </div>

                <div className="flex gap-3">
                    <Button
                        onClick={toggleQr}
                        disabled={loading}
                        className={`flex gap-2 items-center text-white ${session.qrEnabled ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {session.qrEnabled ? <><XCircle size={16} /> Close QR</> : <><QrCode size={16} /> Generate QR</>}
                    </Button>
                    <Button onClick={endSession} variant="danger" disabled={loading} className="flex gap-2 items-center">
                        <Square size={16} /> End Class
                    </Button>
                </div>
            </div>

            {session.qrEnabled && qrCode && (
                <div className="mt-8 flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                        <QRCodeSVG value={qrCode} size={256} level="H" includeMargin={true} />
                    </div>
                    <div className="mt-4 text-center">
                        <p className="text-4xl font-mono font-bold tracking-wider text-gray-800 mb-2">{qrCode}</p>
                        <div className="flex items-center justify-center gap-2 text-sm font-medium">
                            <RefreshCw size={14} className={`text-blue-500 ${timeLeft < 5 ? 'animate-spin' : ''}`} />
                            <span className={timeLeft < 5 ? 'text-red-500' : 'text-gray-500'}>
                                Refreshes in {timeLeft}s
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}
