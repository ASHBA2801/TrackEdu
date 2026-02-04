import { Suspense } from "react";
import { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
    title: "Login - TrackEdu",
    description: "Login to your account",
};

export default function LoginPage() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6 overflow-y-auto">
            <Suspense fallback={<div className="text-center">Loading...</div>}>
                <LoginForm />
            </Suspense>
        </main>
    );
}
