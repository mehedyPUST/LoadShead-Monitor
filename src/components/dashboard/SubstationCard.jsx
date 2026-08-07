'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { memo } from 'react';
import { Building2, MapPin, ChevronRight } from 'lucide-react';

const SubstationCard = memo(({ substation, index }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.08 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="group rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200"
        >
            <Link href={`/substation/${substation.id}`} className="block">
                <div className="p-5">
                    <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 shrink-0 group-hover:bg-emerald-100 transition-colors">
                            <Building2 size={20} strokeWidth={2} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
                                        {substation.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        {substation.code}
                                    </p>
                                </div>

                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
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
                            className="text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1"
                        />
                    </div>
                </div>
            </Link>
        </motion.div>
    );
});

SubstationCard.displayName = 'SubstationCard';

export default SubstationCard;