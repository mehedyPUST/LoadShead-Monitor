'use client';

import React, { useState, useEffect } from 'react';
import { GridLoader } from 'react-spinners';

const Spinner = ({
    size,           // Now optional – auto-calculates if not provided
    color = "#10B981",
    loading = true,
    message = "Loading..."
}) => {
    const [isClient, setIsClient] = useState(false);
    const [responsiveSize, setResponsiveSize] = useState(24);

    useEffect(() => {
        setIsClient(true);

        // Calculate size based on screen width
        const updateSize = () => {
            const width = window.innerWidth;
            if (width < 640) return 20;       // Mobile
            if (width < 1024) return 28;      // Tablet
            return 36;                        // Desktop
        };

        setResponsiveSize(updateSize());
    }, []);

    if (!loading || !isClient) return null;

    // Use user-provided size or fallback to responsive
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