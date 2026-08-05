'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
    const router = useRouter();
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const getRoleDisplay = (role) => {
        switch (role) {
            case 'admin': return 'Admin';
            case 'sba': return 'SBA';
            case 'viewer': return 'Viewer';
            default: return role;
        }
    };

    return (
        <nav className="bg-white shadow-md sticky top-0 z-50 border-b border-gray-200">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                <Link href="/" className="text-lg md:text-xl font-bold text-emerald-700 hover:text-emerald-800 transition">
                    LoadShed Monitor
                </Link>

                <div className="flex items-center gap-4">
                    {/* Navigation Links */}
                    {user && (
                        <>
                            <Link href="/" className="text-sm text-gray-700 hover:text-emerald-600 transition">
                                Dashboard
                            </Link>
                            <Link href="/feeders" className="text-sm text-gray-700 hover:text-emerald-600 transition">
                                Feeders
                            </Link>
                            {user.role === 'admin' && (
                                <Link href="/admin" className="text-sm text-gray-700 hover:text-emerald-600 transition">
                                    Admin
                                </Link>
                            )}
                        </>
                    )}

                    {/* User Info & Logout */}
                    {user ? (
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600 hidden sm:inline">
                                {user.name} ({getRoleDisplay(user.role)})
                            </span>
                            <button
                                onClick={handleLogout}
                                className="text-sm text-gray-600 hover:text-emerald-600 transition"
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <Link href="/login" className="text-sm text-gray-600 hover:text-emerald-600 transition">
                            Login
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
}