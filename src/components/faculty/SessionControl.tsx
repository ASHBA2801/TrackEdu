
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button, Card } from '@/components/ui'; // Assuming these exist
import { QRCodeSVG } from 'qrcode.react';
import { Play, Square, QrCode, XCircle, RefreshCw } from 'lucide-react';

type Session = {
    id: string;
    status: 'ACTIVE' | 'COMPLETED';
    qrEnabled: boolean;
    currentQrCode: string | null;
    currentQrExpiresAt: string | null;
};

export default function SessionControl({ subjectId, facultyId }: { subjectId: string; facultyId: string }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const pollInterval = useRef<NodeJS.Timeout | null>(null);

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
                body: JSON.stringify({ facultyId, subjectId, latitude: lat, longitude: lng }),
            });
            const data = await res.json();
            setSession(data);
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

    if (!session) {
        return (
            <Card className="p-6 mb-6 bg-white shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">Class Session</h3>
                        <p className="text-gray-500 text-sm">Start a live session to take automatic attendance.</p>
                    </div>
                    <Button onClick={startSession} isLoading={loading} className="bg-green-600 hover:bg-green-700 text-white flex gap-2">
                        <Play size={16} /> Start Class
                    </Button>
                </div>
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
