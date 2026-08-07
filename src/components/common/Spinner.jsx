'use client';

import React, { useState, useEffect } from 'react';
import { GridLoader } from 'react-spinners';

const Spinner = ({
    size = 15,
    color = "#10B981",
    loading = true,
    message = "Loading..."
}) => {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
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