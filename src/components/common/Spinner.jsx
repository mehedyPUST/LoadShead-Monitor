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
    const [size, setSize] = useState(20);

    useEffect(() => {
        setIsClient(true);

        if (propSize) {
            setSize(propSize);
            return;
        }

        const getSize = () => {
            const w = window.innerWidth;
            if (w < 640) return 20;
            if (w < 1024) return 28;
            return 36;
        };

        setSize(getSize());

        const handleResize = () => setSize(getSize());
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

    if (!fullScreen) {
        return content;
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
            {content}
        </div>
    );
};

export default Spinner;