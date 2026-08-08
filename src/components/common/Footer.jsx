'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Mail, Phone, MapPin, Zap, Github, Linkedin } from 'lucide-react';

export default function Footer() {
    const pathname = usePathname();
    const currentYear = new Date().getFullYear();

    // Don't show footer on login page
    if (pathname === '/login') return null;

    return (
        <footer className="bg-gray-900 text-gray-300 mt-auto border-t border-gray-800">
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Company Info */}
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-600/20 text-emerald-400">
                                <Zap size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white tracking-tight">
                                    WZPDCL
                                </h3>
                                <p className="text-xs text-gray-400">
                                    West Zone Power Distribution Company Ltd.
                                </p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400 max-w-md leading-relaxed">
                            Sales and Distribution Division-1, Kushtia.
                            An Enterprise of Bangladesh Power Development Board.
                        </p>
                        <div className="flex items-center gap-4 mt-4">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <MapPin size={14} className="text-emerald-500" />
                                Kushtia, Bangladesh
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Phone size={14} className="text-emerald-500" />
                                +880 1711-123456
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Mail size={14} className="text-emerald-500" />
                                info@wzpdcl.gov.bd
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-sm font-semibold text-white mb-3">Quick Links</h4>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href="/" className="text-gray-400 hover:text-emerald-400 transition-colors">
                                    Dashboard
                                </Link>
                            </li>
                            <li>
                                <Link href="/feeders" className="text-gray-400 hover:text-emerald-400 transition-colors">
                                    All Feeders
                                </Link>
                            </li>
                            <li>
                                <Link href="/live" className="text-gray-400 hover:text-emerald-400 transition-colors">
                                    Live Events
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="text-sm font-semibold text-white mb-3">Support</h4>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href="#" className="text-gray-400 hover:text-emerald-400 transition-colors">
                                    Help Center
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="text-gray-400 hover:text-emerald-400 transition-colors">
                                    Contact Support
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="text-gray-400 hover:text-emerald-400 transition-colors">
                                    Report Issue
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500">
                    <p>
                        © {currentYear} West Zone Power Distribution Company Limited.
                        All rights reserved.
                    </p>
                    <div className="flex items-center gap-4">
                        <Link href="#" className="hover:text-emerald-400 transition-colors">
                            Privacy Policy
                        </Link>
                        <span className="text-gray-700">|</span>
                        <Link href="#" className="hover:text-emerald-400 transition-colors">
                            Terms of Service
                        </Link>
                        <span className="text-gray-700">|</span>
                        <span className="text-gray-600">
                            v1.0.0
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}