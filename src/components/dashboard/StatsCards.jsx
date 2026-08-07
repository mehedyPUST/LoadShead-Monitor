'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Building2, Zap, Activity, Radio } from 'lucide-react';

const StatsCards = memo(({ stats }) => {
    const totalSubstations = stats.totalSubstations || 0;
    const totalFeeders = stats.totalFeeders || 0;
    const totalSheds = stats.totalSheds || 0;
    const liveCount = stats.liveCount || 0;

    const cards = [
        {
            label: 'Substations',
            value: totalSubstations,
            icon: Building2,
            color: 'border-purple-500 bg-purple-50/60',
            iconBg: 'bg-purple-100 text-purple-600',
            valueColor: 'text-purple-700',
            hint: 'Active grid substations',
        },
        {
            label: 'Feeders',
            value: totalFeeders,
            icon: Zap,
            color: 'border-blue-500 bg-blue-50/60',
            iconBg: 'bg-blue-100 text-blue-600',
            valueColor: 'text-blue-700',
            hint: 'Across all substations',
        },
        {
            label: "Today's Events",
            value: totalSheds,
            icon: Activity,
            color: 'border-red-500 bg-red-50/60',
            iconBg: 'bg-red-100 text-red-600',
            valueColor: 'text-red-700',
            hint: 'Total loadshed events',
        },
        {
            label: 'Live Now',
            value: liveCount,
            icon: Radio,
            color: liveCount > 0
                ? 'border-red-500 bg-red-50/60'
                : 'border-emerald-500 bg-emerald-50/60',
            iconBg: liveCount > 0
                ? 'bg-red-100 text-red-600'
                : 'bg-emerald-100 text-emerald-600',
            valueColor: liveCount > 0 ? 'text-red-700' : 'text-emerald-700',
            hint: liveCount > 0 ? `${liveCount} active` : 'No active events',
            pulse: liveCount > 0,
        },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {cards.map((card, index) => {
                const Icon = card.icon;
                return (
                    <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.08 }}
                        className={`relative overflow-hidden rounded-xl border border-gray-100 border-l-4 ${card.color} p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-shadow`}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg ${card.iconBg} shrink-0`}>
                                <Icon
                                    size={18}
                                    strokeWidth={2}
                                    className={card.pulse ? 'animate-pulse' : ''}
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                                    {card.label}
                                </p>
                                <p className={`text-xl sm:text-2xl font-bold tabular-nums leading-tight mt-0.5 ${card.valueColor} ${card.pulse ? 'animate-pulse' : ''}`}>
                                    {card.value}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-1 hidden sm:block truncate">
                                    {card.hint}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
});

StatsCards.displayName = 'StatsCards';

export default StatsCards;