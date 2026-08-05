'use client';

import { motion } from 'framer-motion';

export default function StatsCards({ stats }) {
    const cards = [
        { label: 'Total Substations', value: stats.totalSubstations || 0, icon: '🏢', color: 'purple' },
        { label: 'Total Feeders', value: stats.totalFeeders || 0, icon: '⚡', color: 'blue' },
        { label: "Today's Sheds", value: stats.totalSheds || 0, icon: '🔴', color: 'red' },
        { label: "Today's Duration", value: `${stats.totalDuration || 0} mins`, icon: '⏱️', color: 'yellow' },
    ];

    const colorMap = {
        purple: 'border-purple-200 bg-purple-50 text-purple-700',
        blue: 'border-blue-200 bg-blue-50 text-blue-700',
        red: 'border-red-200 bg-red-50 text-red-700',
        yellow: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {cards.map((card, index) => (
                <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className={`card p-4 border-l-4 ${colorMap[card.color]}`}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{card.icon}</span>
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.label}</p>
                            <p className="text-2xl font-bold">{card.value}</p>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}