'use client';

import Link from 'next/link';
import Image from 'next/image';
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
        <nav className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white shadow-lg sticky top-0 z-50">
            <div className="container mx-auto px-4 py-3">
                <div className="flex flex-col items-center justify-center gap-2 mb-3 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                            <Image
                                src="https://i.ibb.co.com/VYBv8n64/Untitled-1.png"
                                alt="WZPDCL Logo"
                                width={64}
                                height={64}
                                className="h-14 w-auto md:h-16 object-contain brightness-0 invert"
                                priority
                                unoptimized
                            />
                        </div>
                        <div className="text-center">
                            <h1 className="text-base md:text-lg lg:text-xl font-bold tracking-wide">
                                West Zone Power Distribution Company Limited
                            </h1>
                            <p className="text-xs md:text-sm opacity-90">
                                Sales and Distribution Division-1, Kushtia
                            </p>
                            <p className="text-[10px] md:text-xs opacity-75">
                                An Enterprise of Bangladesh Power Development Board
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <Link href="/" className="text-base md:text-lg font-bold hover:text-emerald-200 transition">
                        LoadShed Monitor
                    </Link>

                    <div className="flex items-center gap-2">
                        {user ? (
                            <>
                                {user.role === 'admin' && (
                                    <>
                                        <Link
                                            href="/admin"
                                            className="text-xs md:text-sm hover:text-emerald-200 transition"
                                        >
                                            Admin
                                        </Link>
                                        <span className="text-white/30">|</span>
                                    </>
                                )}
                                <span className="text-xs md:text-sm hidden sm:inline opacity-90">
                                    {user.name} ({getRoleDisplay(user.role)})
                                </span>
                                <span className="text-white/30 hidden sm:inline">|</span>
                                <button
                                    onClick={handleLogout}
                                    className="text-xs md:text-sm hover:text-emerald-200 transition"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <Link
                                href="/login"
                                className="text-xs md:text-sm hover:text-emerald-200 transition"
                            >
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}