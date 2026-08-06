'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';

const StatsCards = memo(({ stats }) => {
    const totalSubstations = stats.totalSubstations || 0;
    const totalFeeders = stats.totalFeeders || 0;
    const totalSheds = stats.totalSheds || 0;
    const liveCount = stats.liveCount || 0;

    const cards = [
        {
            label: 'Substations',
            value: totalSubstations,
            icon: '🏢',
            color: 'border-purple-200 bg-purple-50 text-purple-700',
            hint: 'Active grid substations',
        },
        {
            label: 'Feeders',
            value: totalFeeders,
            icon: '⚡',
            color: 'border-blue-200 bg-blue-50 text-blue-700',
            hint: 'Across all substations',
        },
        {
            label: "Today's Events",
            value: totalSheds,
            icon: '🔴',
            color: 'border-red-200 bg-red-50 text-red-700',
            hint: 'Total loadshed events',
        },
        {
            label: 'Live Now',
            value: liveCount,
            icon: liveCount > 0 ? '🔴' : '🟢',
            color: liveCount > 0 ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700',
            hint: liveCount > 0 ? `${liveCount} active` : 'No active events',
            pulse: liveCount > 0,
        },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {cards.map((card, index) => (
                <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className={`card p-3 sm:p-4 border-l-4 ${card.color}`}
                >
                    <div className="flex items-center gap-2 sm:gap-3">
                        <span className={`text-xl sm:text-2xl ${card.pulse ? 'animate-pulse' : ''}`}>
                            {card.icon}
                        </span>
                        <div>
                            <p className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">
                                {card.label}
                            </p>
                            <p className={`text-lg sm:text-2xl font-bold ${card.pulse ? 'animate-pulse' : ''}`}>
                                {card.value}
                            </p>
                            <p className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5 hidden sm:block">
                                {card.hint}
                            </p>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
});

StatsCards.displayName = 'StatsCards';

export default StatsCards;