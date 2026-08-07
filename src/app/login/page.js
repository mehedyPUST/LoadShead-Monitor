'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Zap,
    User,
    Lock,
    Eye,
    EyeOff,
    AlertTriangle,
    Shield,
    UserCog
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
    const router = useRouter();
    const { login, user, loading } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (!loading && user) {
            router.push('/');
        }
    }, [loading, user, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="text-gray-400 text-sm">Loading...</div>
            </div>
        );
    }

    if (user) {
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const trimmedUsername = username.trim().toLowerCase();
        if (!trimmedUsername) {
            setError('Username is required');
            setIsLoading(false);
            return;
        }

        try {
            const result = await login(trimmedUsername, password);
            if (result.success) {
                router.push('/');
            } else {
                setError(result.error || 'Login failed. Please check your credentials.');
            }
        } catch (err) {
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-emerald-50/40 px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md w-full"
            >
                {/* Logo / Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto mb-4">
                        <Zap size={28} strokeWidth={2} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                        LoadShed Monitor
                    </h1>
                    <p className="text-gray-500 mt-1.5 text-sm">
                        Sign in to your account
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 text-red-600 p-3.5 rounded-xl mb-5 text-sm border border-red-100 flex items-start gap-2.5"
                    >
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </motion.div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Username
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <User size={16} className="text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition text-sm"
                                placeholder="Enter your username"
                                autoComplete="username"
                                required
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">
                            Use your username (e.g., admin, karim, johndoe)
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Password
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Lock size={16} className="text-gray-400" />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-11 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition text-sm"
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-medium hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                    >
                        {isLoading ? (
                            <>
                                <svg
                                    className="animate-spin h-4 w-4 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                {/* Demo Credentials */}
                <div className="mt-7">
                    <p className="text-xs font-medium text-gray-400 text-center mb-2.5">
                        Demo Credentials
                    </p>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="flex items-center gap-2">
                                <Shield size={14} className="text-purple-500" />
                                <span className="font-medium text-gray-700">Admin</span>
                            </span>
                            <span className="text-xs text-gray-500 font-mono">
                                admin / admin123
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="flex items-center gap-2">
                                <UserCog size={14} className="text-blue-500" />
                                <span className="font-medium text-gray-700">SBA</span>
                            </span>
                            <span className="text-xs text-gray-500 font-mono">
                                karim / admin123
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mt-7 text-center">
                    <p className="text-xs text-gray-400">
                        © {new Date().getFullYear()} LoadShed Monitor. All rights reserved.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}