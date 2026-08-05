'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

export default function VerticalBarChart({ feeders, records }) {
    const [hoveredBar, setHoveredBar] = useState(null);

    const feederData = feeders.map((feeder) => {
        const feederRecords = records.filter(r => r.feederId === feeder.id);
        const totalMinutes = feederRecords.reduce((sum, r) => sum + r.duration, 0);
        const spellCount = feederRecords.length;
        return { ...feeder, totalMinutes, spellCount };
    });

    const maxMinutes = Math.max(...feederData.map(f => f.totalMinutes), 1);

    const colors = [
        '#4F46E5', '#7C3AED', '#EC4899', '#EF4444', '#F59E0B',
        '#10B981', '#06B6D4', '#3B82F6', '#8B5CF6', '#14B8A6',
    ];

    const getShortName = (name) => {
        if (name.length <= 12) return name;
        return name.substring(0, 10) + '...';
    };

    const formatDuration = (minutes) => {
        if (minutes === 0) return '0 min';
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    const getBarGradient = (value, max) => {
        const ratio = value / max;
        if (ratio === 0) return '#E5E7EB';
        if (ratio < 0.3) return 'linear-gradient(180deg, #34D399, #10B981)';
        if (ratio < 0.6) return 'linear-gradient(180deg, #FBBF24, #F59E0B)';
        if (ratio < 0.8) return 'linear-gradient(180deg, #FB923C, #F97316)';
        return 'linear-gradient(180deg, #F87171, #EF4444)';
    };

    const getStatusLabel = (value) => {
        if (value === 0) return { text: 'No Loadshed', color: 'text-gray-400' };
        if (value < 30) return { text: 'Low', color: 'text-emerald-600' };
        if (value < 60) return { text: 'Moderate', color: 'text-amber-600' };
        if (value < 120) return { text: 'High', color: 'text-orange-600' };
        return { text: 'Critical', color: 'text-red-600' };
    };

    const totalDuration = feederData.reduce((sum, f) => sum + f.totalMinutes, 0);
    const feedersWithShed = feederData.filter(f => f.totalMinutes > 0).length;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="relative px-6 pt-6 pb-4 border-b border-gray-100">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <span className="text-xl">📊</span>
                            Feeder-wise Loadshed Analysis
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Duration distribution across {feeders.length} feeders
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-full border border-gray-200">
                            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" />
                            Duration
                        </span>
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-full border border-gray-200">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                            Spells
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-100">
                <div className="bg-white px-4 py-3 text-center">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Feeders</p>
                    <p className="text-xl font-bold text-gray-800">{feeders.length}</p>
                </div>
                <div className="bg-white px-4 py-3 text-center">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Affected Feeders</p>
                    <p className="text-xl font-bold text-red-600">{feedersWithShed}</p>
                </div>
                <div className="bg-white px-4 py-3 text-center">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Duration</p>
                    <p className="text-xl font-bold text-amber-600">{formatDuration(totalDuration)}</p>
                </div>
                <div className="bg-white px-4 py-3 text-center">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Max Duration</p>
                    <p className="text-xl font-bold text-purple-600">{formatDuration(maxMinutes)}</p>
                </div>
            </div>

            <div className="px-6 py-6">
                <div className="w-full overflow-x-auto">
                    <div className="min-w-[600px] h-80 flex items-end gap-2 pt-4 pb-2">
                        {feederData.map((item, index) => {
                            const heightPercent = maxMinutes > 0 ? (item.totalMinutes / maxMinutes) * 100 : 0;
                            const barHeight = Math.max(heightPercent, 4);
                            const status = getStatusLabel(item.totalMinutes);
                            const isHovered = hoveredBar === index;

                            return (
                                <div
                                    key={item.id}
                                    className="flex-1 flex flex-col items-center h-full group"
                                    onMouseEnter={() => setHoveredBar(index)}
                                    onMouseLeave={() => setHoveredBar(null)}
                                >
                                    <div className="relative w-full max-w-[56px] flex-1 flex items-end">
                                        <div className={`
                                            absolute -top-20 left-1/2 -translate-x-1/2 
                                            bg-gray-900 text-white text-xs rounded-lg px-3 py-2 
                                            transition-all duration-200 z-20
                                            ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
                                            min-w-[120px] text-center shadow-xl
                                        `}>
                                            <div className="font-semibold text-white/90 mb-0.5">{item.name}</div>
                                            <div className="flex items-center justify-center gap-3">
                                                <span className="text-white font-bold">{item.totalMinutes} mins</span>
                                                <span className="text-white/50">|</span>
                                                <span className="text-blue-300">{item.spellCount} spells</span>
                                            </div>
                                            <div className={`text-xs mt-0.5 text-white/80`}>
                                                {status.text}
                                            </div>
                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                                        </div>

                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${barHeight}%` }}
                                            transition={{ duration: 0.6, delay: index * 0.05, ease: "easeOut" }}
                                            className="w-full relative group"
                                            style={{
                                                height: `${barHeight}%`,
                                                minHeight: item.totalMinutes > 0 ? '8px' : '4px',
                                                background: getBarGradient(item.totalMinutes, maxMinutes),
                                                borderRadius: '6px 6px 0 0',
                                                boxShadow: item.totalMinutes > 0 ? '0 2px 8px rgba(79, 70, 229, 0.15)' : 'none',
                                            }}
                                        >
                                            {item.totalMinutes > 0 && (
                                                <div className={`
                                                    absolute inset-0 rounded-t-lg transition-opacity duration-300
                                                    ${isHovered ? 'opacity-100' : 'opacity-0'}
                                                    shadow-[0_0_20px_rgba(79,70,229,0.3)]
                                                `} />
                                            )}
                                            {item.spellCount > 0 && (
                                                <div className="absolute -top-2.5 -right-2.5 bg-blue-500 text-white text-[8px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-md border-2 border-white">
                                                    {item.spellCount}
                                                </div>
                                            )}
                                        </motion.div>
                                    </div>

                                    <div className="mt-2 text-xs font-semibold text-gray-700">
                                        {item.totalMinutes > 0 ? `${item.totalMinutes}m` : '0'}
                                    </div>

                                    <div className="text-[10px] text-gray-500 text-center leading-tight max-w-[52px] truncate font-medium">
                                        {getShortName(item.name)}
                                    </div>

                                    <div className={`mt-1 w-1.5 h-1.5 rounded-full ${item.totalMinutes > 0 ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-2 text-center text-[10px] text-gray-400 border-t border-gray-100 pt-2">
                    <span className="inline-block px-3">← Feeders →</span>
                </div>
            </div>

            <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 flex flex-wrap justify-between items-center gap-2 text-xs text-gray-500">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-gradient-to-r from-emerald-400 to-emerald-600" />
                        Low
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-gradient-to-r from-amber-400 to-amber-600" />
                        Moderate
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-gradient-to-r from-orange-400 to-orange-600" />
                        High
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-gradient-to-r from-red-400 to-red-600" />
                        Critical
                    </span>
                </div>
                <div>
                    <span className="font-medium text-gray-600">
                        {feedersWithShed} of {feeders.length} feeders affected
                    </span>
                </div>
            </div>
        </div>
    );
}