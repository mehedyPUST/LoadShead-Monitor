'use client';

import React, { useState, useEffect } from 'react';
import { GridLoader } from 'react-spinners';

const Spinner = ({
    color = '#10B981',
    loading = true,
    message = 'Loading...',
    size: propSize,
    fullScreen = true,
}) => {
    const [isClient, setIsClient] = useState(false);
    const [size, setSize] = useState(12);

    useEffect(() => {
        setIsClient(true);

        if (propSize) {
            setSize(propSize);
            return;
        }

        const getResponsiveSize = () => {
            const width = window.innerWidth;

            if (width < 640) return 12;   // mobile → small & compact
            if (width < 768) return 16;   // sm
            if (width < 1024) return 20;  // md
            if (width < 1280) return 24;  // lg
            return 28;                    // xl and above
        };

        setSize(getResponsiveSize());

        const handleResize = () => setSize(getResponsiveSize());
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, [propSize]);

    if (!loading || !isClient) return null;

    const content = (
        <div className="flex flex-col items-center justify-center gap-3">
            <GridLoader size={size} color={color} loading={loading} />
            {message && (
                <p className="text-sm text-gray-500 font-medium animate-pulse">
                    {message}
                </p>
            )}
        </div>
    );

    if (!fullScreen) return content;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            {content}
        </div>
    );
};

export default Spinner;