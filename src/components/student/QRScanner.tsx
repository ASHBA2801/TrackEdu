
'use client';

import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Button, Card } from '@/components/ui';
import { Loader2, MapPin, CheckCircle, XCircle } from 'lucide-react';

export default function QRScanner({ studentId }: { studentId: string }) {
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [manualCode, setManualCode] = useState('');

    useEffect(() => {
        let scanner: any;
        if (scanning) {
            scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
            );

            scanner.render(onScanSuccess, onScanFailure);
        }

        function onScanSuccess(decodedText: string) {
            handleScan(decodedText);
            setScanning(false);
            scanner.clear();
        }

        function onScanFailure(error: any) {
            // handle scan failure, usually better to ignore and keep scanning
        }

        return () => {
            if (scanner) {
                try { scanner.clear(); } catch (e) { }
            }
        };
    }, [scanning]);

    const handleScan = async (code: string) => {
        setLoading(true);
        setResult(null);

        try {
            // Get Location
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
            });

            const res = await fetch('/api/student/attendance/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    qrCode: code,
                    studentId,
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setResult({ success: true, message: `Attendance Marked Successfully!` });
            } else {
                setResult({ success: false, message: data.error || 'Failed to mark attendance' });
            }

        } catch (e: any) {
            console.error(e);
            if (e.code === 1) { // PERMISSION_DENIED
                setResult({ success: false, message: 'Location permission is required.' });
            } else {
                setResult({ success: false, message: 'Error marking attendance. Please try again.' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="p-6 max-w-md mx-auto mt-6">
            <h2 className="text-xl font-bold mb-4 text-center">Scan Attendance QR</h2>

            {result && (
                <div className={`p-4 mb-4 rounded-lg flex items-center gap-3 ${result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {result.success ? <CheckCircle /> : <XCircle />}
                    <p>{result.message}</p>
                </div>
            )}

            {!scanning && !loading && (
                <div className="flex flex-col gap-4">
                    <Button onClick={() => setScanning(true)} className="w-full py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white">
                        Open Camera Scanner
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-500">Or enter code manually</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                            placeholder="ENTER CODE"
                            className="flex-1 px-4 py-2 border rounded-md uppercase font-mono tracking-widest text-center"
                            maxLength={8}
                        />
                        <Button onClick={() => handleScan(manualCode)} disabled={!manualCode}>
                            Submit
                        </Button>
                    </div>
                </div>
            )}

            {scanning && (
                <div>
                    <div id="reader"></div>
                    <Button variant="outline" onClick={() => setScanning(false)} className="w-full mt-4">
                        Cancel Scan
                    </Button>
                </div>
            )}

            {loading && (
                <div className="text-center py-8">
                    <Loader2 className="animate-spin mx-auto h-8 w-8 text-blue-500" />
                    <p className="mt-2 text-gray-500">Verifying attendance...</p>
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-400 mt-2">
                        <MapPin size={12} /> Verifying location & enrollment
                    </div>
                </div>
            )}
        </Card>
    );
}
