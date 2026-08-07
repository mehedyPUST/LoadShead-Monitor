'use client';

import React, { useState, useEffect } from 'react';
import { GridLoader } from 'react-spinners';

const Spinner = ({
    size,                    // optional override
    color = "#10B981",
    loading = true,
    message = "Loading..."
}) => {
    const [isClient, setIsClient] = useState(false);
    const [responsiveSize, setResponsiveSize] = useState(24);

    useEffect(() => {
        setIsClient(true);

        const updateSize = () => {
            const w = window.innerWidth;
            if (w < 640) return 20;      // mobile
            if (w < 1024) return 28;     // tablet
            return 36;                   // desktop
        };

        setResponsiveSize(updateSize());

        // Recalculate on resize (optional but nice)
        const handleResize = () => setResponsiveSize(updateSize());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!loading || !isClient) return null;

    const finalSize = size || responsiveSize;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
            <div className="flex flex-col items-center justify-center gap-3">
                <GridLoader size={finalSize} color={color} loading={loading} />
                {message && <p className="text-sm text-gray-500 animate-pulse">{message}</p>}
            </div>
        </div>
    );
};

export default Spinner;