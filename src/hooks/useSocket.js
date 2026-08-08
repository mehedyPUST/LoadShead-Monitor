'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';

export function useSocket(subscription) {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);
    const socketRef = useRef(null);
    const subscriptionRef = useRef(subscription);

    useEffect(() => {
        subscriptionRef.current = subscription;
    }, [subscription]);

    useEffect(() => {
        const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ||
            process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ||
            'http://localhost:5000';

        // Only connect if we're in the browser
        if (typeof window === 'undefined') return;

        socketRef.current = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketRef.current.on('connect', () => {
            console.log('🔌 Socket connected');
            setIsConnected(true);
            if (subscriptionRef.current) {
                socketRef.current.emit('subscribe', subscriptionRef.current);
            }
        });

        socketRef.current.on('disconnect', () => {
            console.log('🔌 Socket disconnected');
            setIsConnected(false);
        });

        socketRef.current.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        // Listen for live events
        socketRef.current.on('live-started', (data) => {
            console.log('📨 Live started:', data);
            setLastMessage({ type: 'live-started', data });
        });

        socketRef.current.on('live-withdrawn', (data) => {
            console.log('📨 Live withdrawn:', data);
            setLastMessage({ type: 'live-withdrawn', data });
        });

        socketRef.current.on('new-record', (data) => {
            console.log('📨 New record:', data);
            setLastMessage({ type: 'new-record', data });
        });

        socketRef.current.on('record-updated', (data) => {
            console.log('📨 Record updated:', data);
            setLastMessage({ type: 'record-updated', data });
        });

        socketRef.current.on('record-deleted', (data) => {
            console.log('📨 Record deleted:', data);
            setLastMessage({ type: 'record-deleted', data });
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, []);

    const subscribe = useCallback((data) => {
        if (socketRef.current && isConnected) {
            socketRef.current.emit('subscribe', data);
        }
    }, [isConnected]);

    const unsubscribe = useCallback((data) => {
        if (socketRef.current && isConnected) {
            socketRef.current.emit('unsubscribe', data);
        }
    }, [isConnected]);

    const on = useCallback((event, callback) => {
        if (socketRef.current) {
            socketRef.current.on(event, callback);
        }
    }, []);

    const off = useCallback((event, callback) => {
        if (socketRef.current) {
            socketRef.current.off(event, callback);
        }
    }, []);

    const emit = useCallback((event, data) => {
        if (socketRef.current && isConnected) {
            socketRef.current.emit(event, data);
        }
    }, [isConnected]);

    return useMemo(() => ({
        isConnected,
        lastMessage,
        subscribe,
        unsubscribe,
        on,
        off,
        emit,
    }), [isConnected, lastMessage, subscribe, unsubscribe, on, off, emit]);
}