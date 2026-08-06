'use client';

import { motion } from 'framer-motion';
import { useMemo, useCallback } from 'react';

export default function HorizontalBarChart({ feeders, records }) {
    // Compute feeder durations
    const feederData = useMemo(() =>
        feeders
            .map((feeder) => {
                const feederRecords = records.filter(r => r.feederId === feeder.id);
                const totalMinutes = feederRecords.reduce((sum, r) => sum + (r.duration || 0), 0);
                const spellCount = feederRecords.length;
                const hasLive = feederRecords.some(r => r.isLive === true);
                return { ...feeder, totalMinutes, spellCount, hasLive };
            })
            .sort((a, b) => b.totalMinutes - a.totalMinutes), // sort descending
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

    // Color based on severity
    const getBarColor = (value, hasLive) => {
        if (hasLive) return '#EF4444'; // red for live
        if (value === 0) return '#E5E7EB';
        if (value < 30) return '#10B981';   // green
        if (value < 60) return '#F59E0B';   // amber
        if (value < 120) return '#F97316';  // orange
        return '#EF4444';                   // red
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Feeder Loadshed Duration</h3>
                <span className="text-xs text-gray-400">
                    {feeders.length} feeders · {feederData.filter(f => f.totalMinutes > 0).length} affected
                </span>
            </div>

            {/* Bars */}
            <div className="px-4 py-3 space-y-1">
                {feederData.map((item, index) => {
                    const barWidth = (item.totalMinutes / maxMinutes) * 100;
                    const color = getBarColor(item.totalMinutes, item.hasLive);

                    return (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.03 }}
                            className="flex items-center gap-3 group"
                        >
                            {/* Feeder name */}
                            <div className="w-28 flex-shrink-0 text-right">
                                <p className="text-xs font-medium text-gray-700 truncate" title={item.name}>
                                    {item.name}
                                </p>
                            </div>

                            {/* Bar track */}
                            <div className="flex-1 h-5 bg-gray-100 rounded-full relative overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.max(barWidth, 1)}%` }}
                                    transition={{ duration: 0.5, delay: index * 0.03, ease: 'easeOut' }}
                                    className={`h-full rounded-full absolute top-0 left-0 ${item.hasLive ? 'animate-pulse' : ''
                                        }`}
                                    style={{
                                        backgroundColor: color,
                                        minWidth: item.totalMinutes > 0 ? '4px' : '0px',
                                        boxShadow: item.hasLive ? '0 0 8px rgba(239,68,68,0.4)' : 'none',
                                    }}
                                />
                            </div>

                            {/* Duration & count */}
                            <div className="w-20 flex-shrink-0 flex items-center gap-2">
                                <span className={`text-xs font-semibold tabular-nums ${item.hasLive ? 'text-red-600' : 'text-gray-600'
                                    }`}>
                                    {item.totalMinutes > 0 ? formatMinutes(item.totalMinutes) : '—'}
                                </span>
                                {item.spellCount > 0 && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${item.hasLive
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        {item.spellCount}
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Footer legend - only if needed */}
            <div className="px-4 py-2 border-t border-gray-100 flex gap-4 text-[10px] text-gray-400 justify-center">
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    &lt;30m
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    30-60m
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    60-120m
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    &gt;120m
                </span>
            </div>
        </div>
    );
}