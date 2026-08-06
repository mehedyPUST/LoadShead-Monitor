'use client';

import { motion } from 'framer-motion';

const colorMap = {
    emerald: '#10b981',
    white: '#ffffff',
    gray: '#6b7280',
    blue: '#3b82f6',
    red: '#ef4444',
    yellow: '#f59e0b',
    purple: '#8b5cf6',
    pink: '#ec4899',
};

export default function Spinner({ size = 24, color = 'emerald' }) {
    const strokeColor = colorMap[color] || color;

    return (
        <div className="inline-flex items-center justify-center" style={{ width: size, height: size }}>
            <motion.svg
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-full h-full"
            >
                <circle
                    cx="12"
                    cy="12"
                    r="10"
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="4"
                    opacity="0.2"
                />
                <circle
                    cx="12"
                    cy="12"
                    r="10"
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="4"
                    strokeDasharray="25 75"
                    strokeLinecap="round"
                />
            </motion.svg>
        </div>
    );
}