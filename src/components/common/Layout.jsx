'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import CompanyHeader from './CompanyHeader';

export default function Layout({ children }) {
    const pathname = usePathname();
    // Show CompanyHeader only on the home page
    const showHeader = pathname === '/';

    return (
        <>
            {showHeader && <CompanyHeader />}
            <Navbar />
            <main className="container mx-auto px-4 py-6 max-w-7xl">
                {children}
            </main>
        </>
    );
}