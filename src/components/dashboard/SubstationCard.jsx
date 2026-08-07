'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { memo } from 'react';
import { Building2, MapPin, ChevronRight } from 'lucide-react';

const SubstationCard = memo(({ substation, index }) => {
    const isEven = index % 2 === 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.08 }}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="group relative rounded-xl overflow-hidden"
        >
            {/* Always visible animated border */}
            <div
                className={`absolute inset-0 rounded-xl ${isEven
                        ? 'bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400'
                        : 'bg-gradient-to-r from-purple-400 via-violet-300 to-purple-500'
                    } opacity-80`}
            />

            {/* Soft outer glow */}
            <div
                className={`absolute -inset-[1px] rounded-xl blur-[1.5px] opacity-40 ${isEven
                        ? 'bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400'
                        : 'bg-gradient-to-r from-purple-400 via-violet-300 to-purple-500'
                    }`}
            />

            {/* Card content - clean white, no filled bg */}
            <div className="relative m-[1.5px] rounded-[10px] bg-white border border-gray-100/80">
                <Link href={`/substation/${substation.id}`} className="block">
                    <div className="p-5">
                        <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div
                                className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${isEven
                                        ? 'bg-emerald-50 text-emerald-600'
                                        : 'bg-purple-50 text-purple-600'
                                    }`}
                            >
                                <Building2 size={20} strokeWidth={2} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
                                            {substation.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-0.5">{substation.code}</p>
                                    </div>

                                    <span
                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border shrink-0 ${isEven
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                : 'bg-purple-50 text-purple-700 border-purple-100'
                                            }`}
                                    >
                                        {substation.feederCount || 0} Feeders
                                    </span>
                                </div>

                                {substation.location && (
                                    <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-400">
                                        <MapPin size={13} className="shrink-0" />
                                        <span className="truncate">{substation.location}</span>
                                    </div>
                                )}
                            </div>

                            {/* Arrow */}
                            <ChevronRight
                                size={18}
                                className={`text-gray-300 group-hover:translate-x-0.5 transition-all shrink-0 mt-1 ${isEven ? 'group-hover:text-emerald-500' : 'group-hover:text-purple-500'
                                    }`}
                            />
                        </div>
                    </div>
                </Link>
            </div>
        </motion.div>
    );
});

SubstationCard.displayName = 'SubstationCard';

export default SubstationCard;