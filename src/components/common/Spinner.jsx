'use client';

import React, { useState, useEffect } from 'react';
import { GridLoader } from 'react-spinners';

const Spinner = ({
    color = "#10B981",
    loading = true,
    message = "Loading..."
}) => {
    const [isClient, setIsClient] = useState(false);
    const [size, setSize] = useState(20); // safe mobile‑first default

    useEffect(() => {
        setIsClient(true);

        const getSize = () => {
            const w = window.innerWidth;
            if (w < 640) return 20;      // mobile
            if (w < 1024) return 28;     // tablet
            return 36;                   // desktop
        };

        setSize(getSize());

        const handleResize = () => setSize(getSize());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!loading || !isClient) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
            <div className="flex flex-col items-center justify-center gap-3">
                <GridLoader size={size} color={color} loading={loading} />
                {message && <p className="text-sm text-gray-500 animate-pulse">{message}</p>}
            </div>
        </div>
    );
};

export default Spinner;