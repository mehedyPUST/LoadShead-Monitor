'use client';

import { motion } from 'framer-motion';
import { useMemo, useCallback, useState, useEffect } from 'react';

export default function HorizontalBarChart({ feeders, records }) {
    const [isMobile, setIsMobile] = useState(false);
    const [isTablet, setIsTablet] = useState(false);

    useEffect(() => {
        const checkScreen = () => {
            const w = window.innerWidth;
            setIsMobile(w < 640);
            setIsTablet(w >= 640 && w < 1024);
        };
        checkScreen();
        window.addEventListener('resize', checkScreen);
        return () => window.removeEventListener('resize', checkScreen);
    }, []);

    const feederData = useMemo(() =>
        feeders
            .map((feeder) => {
                const feederRecords = records.filter(r => r.feederId === feeder.id);
                const totalMinutes = feederRecords.reduce((sum, r) => sum + (r.duration || 0), 0);
                const spellCount = feederRecords.length;
                const hasLive = feederRecords.some(r => r.isLive === true);
                return { ...feeder, totalMinutes, spellCount, hasLive };
            })
            .sort((a, b) => b.totalMinutes - a.totalMinutes),
        [feeders, records]);

    const maxMinutes = useMemo(() =>
        Math.max(...feederData.map(f => f.totalMinutes), 1),
        [feederData]);

    const formatMinutes = useCallback((mins) => {
        if (mins === 0) return '0m';
        if (mins < 60) return `${mins}m`;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }, []);

    const getBarColor = (value, hasLive) => {
        if (hasLive) return '#EF4444';
        if (value === 0) return '#E5E7EB';
        if (value < 30) return '#10B981';
        if (value < 60) return '#F59E0B';
        if (value < 120) return '#F97316';
        return '#EF4444';
    };

    const getBarGradient = (value, hasLive) => {
        if (hasLive) return 'from-red-500 to-red-600';
        if (value === 0) return 'from-gray-200 to-gray-300';
        if (value < 30) return 'from-emerald-400 to-emerald-600';
        if (value < 60) return 'from-amber-400 to-amber-600';
        if (value < 120) return 'from-orange-400 to-orange-600';
        return 'from-red-400 to-red-600';
    };

    // Responsive sizes
    const barHeight = isMobile ? 'h-5' : isTablet ? 'h-6' : 'h-7';
    const fontSize = isMobile ? 'text-[10px]' : 'text-xs';
    const durationWidth = isMobile ? 'w-12' : 'w-16';
    const gap = isMobile ? 'gap-0.5' : 'gap-1';
    const padding = isMobile ? 'px-2 py-1.5' : 'px-3 py-1.5';

    const displayData = isMobile ? feederData.slice(0, 8) : feederData;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-shadow hover:shadow-md">
            {/* Header - Refined */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex flex-wrap items-center justify-between bg-gradient-to-r from-gray-50/50 to-white">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full" />
                    <h3 className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold text-gray-800 tracking-tight`}>
                        Feeder Loadshed Duration
                    </h3>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500 font-medium`}>
                        {displayData.filter(f => f.totalMinutes > 0).length} affected
                    </span>
                    <span className="w-px h-4 bg-gray-200" />
                    <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-400`}>
                        {displayData.length} feeders
                        {isMobile && feederData.length > 8 && ` (top ${displayData.length})`}
                    </span>
                </div>
            </div>

            {/* Bars - Clean spacing */}
            <div className={`${isMobile ? 'px-2 py-3' : 'px-4 sm:px-6 py-4'} space-y-1.5`}>
                {displayData.map((item, index) => {
                    const barWidth = (item.totalMinutes / maxMinutes) * 100;
                    const color = getBarColor(item.totalMinutes, item.hasLive);
                    const gradient = getBarGradient(item.totalMinutes, item.hasLive);
                    const isDark = item.totalMinutes > 30 || item.hasLive;
                    const textColor = isDark ? 'text-white' : 'text-gray-700';
                    const showNameInside = barWidth > 25;

                    return (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.03 }}
                            className={`flex items-center ${gap} group ${padding} rounded-lg hover:bg-gray-50/70 transition-all duration-200`}
                        >
                            {/* Bar track - Refined */}
                            <div className={`flex-1 ${barHeight} bg-gray-100/80 rounded-md relative overflow-hidden shadow-inner`}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.max(barWidth, 1)}%` }}
                                    transition={{ duration: 0.6, delay: index * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
                                    className={`h-full rounded-md absolute top-0 left-0 bg-gradient-to-r ${gradient} ${item.hasLive ? 'animate-pulse' : ''}`}
                                    style={{
                                        minWidth: item.totalMinutes > 0 ? '4px' : '0px',
                                        boxShadow: item.hasLive
                                            ? '0 0 20px rgba(239,68,68,0.3)'
                                            : item.totalMinutes > 0
                                                ? '0 2px 8px rgba(0,0,0,0.05)'
                                                : 'none',
                                    }}
                                >
                                    {showNameInside && (
                                        <span
                                            className={`absolute inset-0 flex items-center px-2 text-left ${fontSize} font-medium ${textColor} truncate tracking-tight`}
                                        >
                                            {item.name}
                                        </span>
                                    )}
                                </motion.div>

                                {!showNameInside && item.totalMinutes > 0 && (
                                    <span className={`absolute inset-0 flex items-center px-2 text-left ${fontSize} font-medium text-gray-600 truncate`}>
                                        {item.name}
                                    </span>
                                )}

                                {item.totalMinutes === 0 && (
                                    <span className={`absolute inset-0 flex items-center px-2 text-left ${fontSize} font-medium text-gray-400 truncate`}>
                                        {item.name}
                                    </span>
                                )}

                                {/* Subtle shimmer on hover */}
                                {item.totalMinutes > 0 && (
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12" />
                                    </div>
                                )}
                            </div>

                            {/* Duration - Polished */}
                            <div className={`${durationWidth} flex-shrink-0 flex items-center gap-0.5 justify-end`}>
                                <span className={`${fontSize} font-semibold tabular-nums ${item.hasLive ? 'text-red-600' : 'text-gray-700'}`}>
                                    {item.totalMinutes > 0 ? formatMinutes(item.totalMinutes) : '—'}
                                </span>
                                {item.spellCount > 0 && !isMobile && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${item.hasLive ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {item.spellCount}
                                    </span>
                                )}
                                {item.spellCount > 0 && isMobile && (
                                    <span className="text-[8px] text-gray-400 ml-0.5 font-medium">
                                        {item.spellCount}x
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Footer - Refined legend */}
            <div className="px-4 sm:px-6 py-2 border-t border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-3 sm:gap-4 text-[10px] text-gray-500">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        &lt;30m
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        30-60m
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                        60-120m
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        &gt;120m
                    </span>
                    <span className="flex items-center gap-1.5 text-red-500 font-medium">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                        LIVE
                    </span>
                </div>
                {isMobile && feederData.length > 8 && (
                    <span className="text-[10px] text-gray-400">
                        + {feederData.length - 8} more
                    </span>
                )}
            </div>
        </div>
    );
}