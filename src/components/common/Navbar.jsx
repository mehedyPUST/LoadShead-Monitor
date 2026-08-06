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
        { href: '/feeders', label: 'Feeders' },
        ...(user?.role === 'admin' ? [{ href: '/admin', label: 'Admin' }] : []),
    ];

    return (
        <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 flex-shrink-0">
                        <img
                            src="/logo.png"
                            alt="WZPDCL Logo"
                            className="h-10 w-auto object-contain"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div className="hidden sm:block">
                            <span className="text-lg font-bold text-gray-800">LoadShed Monitor</span>
                            <span className="text-xs text-gray-500 block -mt-1">WZPDCL</span>
                        </div>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map((link, index) => {
                            const active = isActive(link.href);
                            const Icon = link.icon;
                            return (
                                <div key={link.href} className="flex items-center">
                                    {index > 0 && <span className="text-gray-300 mx-1">|</span>}
                                    <Link
                                        href={link.href}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${active ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        {Icon && <Icon size={18} />}
                                        {link.label}
                                    </Link>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-4">
                        {user ? (
                            <div className="hidden sm:flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">{user.name}</span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                    {getRoleDisplay(user.role)}
                                </span>
                            </div>
                        ) : null}
                        {user ? (
                            <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-emerald-600 hidden sm:block">
                                Logout
                            </button>
                        ) : (
                            <Link href="/login" className="text-sm text-gray-600 hover:text-emerald-600">
                                Login
                            </Link>
                        )}

                        {/* Hamburger */}
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                        >
                            {menuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {menuOpen && (
                    <div className="md:hidden border-t border-gray-100 py-3 space-y-1">
                        {navLinks.map((link) => {
                            const active = isActive(link.href);
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMenuOpen(false)}
                                    className={`block px-3 py-2 rounded-lg text-sm font-medium ${active ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                        {user && (
                            <>
                                <div className="px-3 py-2 text-sm text-gray-500 border-t border-gray-100 mt-2 pt-2">
                                    {user.name} ({getRoleDisplay(user.role)})
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
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