'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
    const pathname = usePathname();
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

    const isActive = (path) => {
        if (path === '/') return pathname === '/';
        return pathname.startsWith(path);
    };

    const navLinks = [
        { href: '/', label: 'Home', icon: Home },
        { href: '/feeders', label: 'Feeders' },
        ...(user?.role === 'admin' ? [{ href: '/admin', label: 'Admin Panel' }] : []),
    ];

    return (
        <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    {/* Logo & Brand */}
                    <Link href="/" className="flex items-center gap-3 flex-shrink-0">
                        <img
                            src="/logo.png"
                            alt="WZPDCL Logo"
                            className="h-10 w-auto object-contain"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                            }}
                        />
                        <div className="hidden sm:block">
                            <span className="text-lg font-bold text-gray-800">LoadShed Monitor</span>
                            <span className="text-xs text-gray-500 block -mt-1">WZPDCL</span>
                        </div>
                    </Link>

                    {/* Nav Links - Center */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map((link, index) => {
                            const active = isActive(link.href);
                            const Icon = link.icon;

                            return (
                                <div key={link.href} className="flex items-center">
                                    {index > 0 && (
                                        <span className="text-gray-300 mx-1">|</span>
                                    )}
                                    <Link
                                        href={link.href}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${active
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                            }`}
                                    >
                                        {Icon && <Icon size={18} className={active ? 'text-emerald-600' : 'text-gray-500'} />}
                                        {link.label}
                                    </Link>
                                </div>
                            );
                        })}
                    </div>

                    {/* User Info - Right */}
                    <div className="flex items-center gap-4">
                        {user ? (
                            <>
                                <div className="hidden sm:flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700">{user.name}</span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                        {getRoleDisplay(user.role)}
                                    </span>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="text-sm text-gray-600 hover:text-emerald-600 transition"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <Link href="/login" className="text-sm text-gray-600 hover:text-emerald-600 transition">
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}