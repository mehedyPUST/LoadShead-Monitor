'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function SubstationCard({ substation, index }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.08 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="card overflow-hidden hover:shadow-lg"
        >
            <Link href={`/substation/${substation.id}`}>
                <div className="p-5">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-gray-800 truncate">
                                🏭 {substation.name}
                            </h3>
                            <p className="text-sm text-gray-500">{substation.code}</p>
                            <p className="text-sm text-gray-400 truncate">{substation.location}</p>
                        </div>
                        <span className="badge badge-emerald ml-2 flex-shrink-0">
                            {substation.feederCount || 0} Feeders
                        </span>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}