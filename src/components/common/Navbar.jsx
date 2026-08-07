'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        router.push('/login');
        setMenuOpen(false);
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
        { href: '/feeders', label: 'All Feeders' },
        ...(user?.role === 'admin' ? [{ href: '/admin', label: 'Admin Panel' }] : []),
    ];

    return (
        <nav className="bg-emerald-700 shadow-lg border-b border-emerald-600/60 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 flex-shrink-0">
                        <img
                            src="/logo.png"
                            alt="WZPDCL Logo"
                            className="h-10 w-auto object-contain brightness-110"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div className="hidden sm:block">
                            <span className="text-lg font-bold text-white tracking-tight">
                                West Zone Power Distribution Company Limited
                            </span>
                            <span className="text-xs text-emerald-300/80 block -mt-0.5">
                                Interruption Tracker
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map((link, index) => {
                            const active = isActive(link.href);
                            const Icon = link.icon;
                            return (
                                <div key={link.href} className="flex items-center">
                                    {index > 0 && (
                                        <span className="text-emerald-400/50 mx-1 select-none">|</span>
                                    )}
                                    <Link
                                        href={link.href}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${active
                                            ? 'bg-emerald-800/70 text-emerald-100 shadow-sm'
                                            : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
                                            }`}
                                    >
                                        {Icon && <Icon size={18} />}
                                        {link.label}
                                    </Link>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right side - User Section with Pipe Separators */}
                    <div className="flex items-center gap-1">
                        {user ? (
                            <>
                                {/* User name & role */}
                                <div className="hidden sm:flex items-center gap-2">
                                    <span className="text-sm font-medium text-emerald-50">
                                        {user.name}
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-800 text-emerald-200 border border-emerald-700">
                                        {getRoleDisplay(user.role)}
                                    </span>
                                </div>

                                {/* Separator */}
                                <span className="text-emerald-400/50 mx-1 select-none hidden sm:block">|</span>

                                {/* Logout */}
                                <button
                                    onClick={handleLogout}
                                    className="text-sm text-emerald-200/80 hover:text-white hidden sm:block transition-colors"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                {/* Login */}
                                <Link
                                    href="/login"
                                    className="text-sm text-emerald-200/80 hover:text-white transition-colors"
                                >
                                    Login
                                </Link>
                            </>
                        )}

                        {/* Hamburger */}
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="md:hidden p-2 rounded-lg text-emerald-200 hover:bg-emerald-900/70 transition-colors ml-1"
                        >
                            {menuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {menuOpen && (
                    <div className="md:hidden border-t border-emerald-800/50 py-3 space-y-1">
                        {navLinks.map((link) => {
                            const active = isActive(link.href);
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMenuOpen(false)}
                                    className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active
                                        ? 'bg-emerald-800/70 text-emerald-100'
                                        : 'text-emerald-100/80 hover:bg-emerald-900/50 hover:text-white'
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}

                        {user && (
                            <>
                                <div className="px-3 py-2 text-sm text-emerald-300/70 border-t border-emerald-800/50 mt-2 pt-3">
                                    {user.name} ({getRoleDisplay(user.role)})
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="block w-full text-left px-3 py-2.5 text-sm text-red-400 hover:bg-red-950/40 hover:text-red-300 rounded-lg transition-colors"
                                >
                                    Logout
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
}