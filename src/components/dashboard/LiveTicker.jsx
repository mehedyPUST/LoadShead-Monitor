'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, X, ChevronRight } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { apiCall } from '@/utils/api';

const formatTime = (date) => {
    if (!date) return '--:--';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatEventText = (event, showSubstation = false) => {
    const feederName = event.feeder?.name || 'Unknown Feeder';
    const substationName = event.substation?.name || '';
    const time = formatTime(event.startTime);
    const reason = event.reason ? ` (${event.reason})` : '';

    if (showSubstation && substationName) {
        return `${substationName} → ${feederName} is in Loadshed from ${time}${reason}`;
    }
    return `${feederName} feeder is in Loadshed from ${time}${reason}`;
};

export default function LiveTicker() {
    const [liveEvents, setLiveEvents] = useState([]);
    const [isVisible, setIsVisible] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const tickerRef = useRef(null);
    const { isConnected, lastMessage, subscribe, unsubscribe } = useSocket();

    // Fetch initial live events
    useEffect(() => {
        const fetchLiveEvents = async () => {
            try {
                const res = await apiCall('/records?status=live');
                if (res.success) {
                    setLiveEvents(res.data || []);
                }
            } catch (error) {
                console.error('Failed to fetch live events:', error);
            }
        };
        fetchLiveEvents();
    }, []);

    // Subscribe to socket events
    useEffect(() => {
        if (isConnected) {
            subscribe({ all: true });
        }
        return () => {
            if (isConnected) {
                unsubscribe({ all: true });
            }
        };
    }, [isConnected, subscribe, unsubscribe]);

    // Handle real-time updates
    useEffect(() => {
        if (!lastMessage) return;

        if (lastMessage.type === 'live-started' || lastMessage.type === 'new-record') {
            const data = lastMessage.data;
            if (data?.isLive) {
                setLiveEvents(prev => {
                    if (prev.some(e => e.id === data.id)) return prev;
                    return [...prev, data];
                });
            }
        } else if (lastMessage.type === 'live-withdrawn' || lastMessage.type === 'record-updated') {
            const data = lastMessage.data;
            if (data?.id) {
                setLiveEvents(prev => prev.filter(e => e.id !== data.id));
            }
        }
    }, [lastMessage]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await apiCall('/records?status=live');
                if (res.success) {
                    setLiveEvents(res.data || []);
                }
            } catch (error) {
                // silent fail
            }
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    // Hide ticker when no live events
    useEffect(() => {
        if (liveEvents.length === 0) {
            setIsVisible(false);
        } else {
            setIsVisible(true);
        }
    }, [liveEvents]);

    // Build the ticker text
    const getTickerText = () => {
        if (liveEvents.length === 0) return '';

        const uniqueSubstations = [...new Set(liveEvents.map(e => e.substationId))];
        const showSubstation = uniqueSubstations.length > 1;

        const texts = liveEvents.map(e => formatEventText(e, showSubstation));
        const separator = '  •  ';
        return texts.join(separator);
    };

    // Duplicate for seamless scrolling
    const tickerContent = getTickerText();
    const duplicatedContent = tickerContent ? `${tickerContent}  ${tickerContent}` : '';

    if (!isVisible || liveEvents.length === 0) return null;

    // ✅ FASTER SPEED: reduced base and multiplier
    const animationDuration = `${Math.max(10, liveEvents.length * 3)}s`;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative bg-gradient-to-r from-red-600 to-red-700 rounded-xl overflow-hidden shadow-lg shadow-red-200/50 mb-6"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Red pulse border */}
            <div className="absolute inset-0 border-2 border-red-400/30 rounded-xl animate-pulse pointer-events-none" />

            <div className="flex items-stretch">
                {/* Fixed left section - Live Badge */}
                <div className="flex items-center gap-2 px-4 py-3 bg-red-700/50 flex-shrink-0 border-r border-red-500/30">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap">
                            LIVE
                        </span>
                        <span className="text-[10px] text-red-200 font-medium bg-red-800/50 px-1.5 py-0.5 rounded-full">
                            {liveEvents.length}
                        </span>
                    </div>
                </div>

                {/* Scrolling Ticker */}
                <div className="flex-1 overflow-hidden px-2 relative">
                    <div
                        ref={tickerRef}
                        className={`flex items-center h-full ${!isHovered ? 'animate-scroll' : 'animation-pause'}`}
                        style={{
                            animationDuration: animationDuration,
                        }}
                    >
                        <span className="text-sm font-medium text-white whitespace-nowrap py-3">
                            {duplicatedContent}
                        </span>
                    </div>

                    {/* Gradient fade on edges */}
                    <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-red-600 to-transparent pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-red-600 to-transparent pointer-events-none" />
                </div>

                {/* Right side - Count + View All */}
                <div className="flex items-center gap-2 px-3 bg-red-700/30 flex-shrink-0 border-l border-red-500/30">
                    <button
                        onClick={() => window.location.href = '/live'}
                        className="flex items-center gap-1 text-xs text-red-100 hover:text-white transition-colors whitespace-nowrap"
                    >
                        View All
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div>

            {/* Mini live events preview - appears on hover */}
            <AnimatePresence>
                {isHovered && liveEvents.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-20 max-h-48 overflow-y-auto"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-700">Live Events</span>
                            <span className="text-[10px] text-red-500 font-medium">{liveEvents.length} active</span>
                        </div>
                        <div className="space-y-1.5">
                            {liveEvents.slice(0, 5).map((event) => (
                                <div
                                    key={event.id}
                                    className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-gray-50 cursor-pointer"
                                    onClick={() => window.location.href = `/feeder/${event.feederId}`}
                                >
                                    <span className="text-gray-700 truncate">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block mr-1.5 animate-pulse" />
                                        {event.feeder?.name || 'Unknown'}
                                    </span>
                                    <span className="text-gray-400 text-[10px] font-mono tabular-nums">
                                        {formatTime(event.startTime)}
                                    </span>
                                </div>
                            ))}
                            {liveEvents.length > 5 && (
                                <div className="text-[10px] text-gray-400 text-center pt-1 border-t border-gray-100">
                                    +{liveEvents.length - 5} more
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}