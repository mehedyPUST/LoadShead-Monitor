'use client';

import Navbar from './Navbar';

export default function Layout({ children }) {
    return (
        <>
            <Navbar />
            <main className="container mx-auto px-4 py-6 max-w-7xl">
                {children}
            </main>
        </>
    );
}