'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const response = await api.getMe();
                if (response.success) {
                    setUser(response.data);
                } else {
                    localStorage.removeItem('token');
                }
            } catch (error) {
                console.error('Error loading user:', error);
                localStorage.removeItem('token');
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, []);

    const login = async (username, password) => {
        try {
            const response = await api.login(username, password);
            if (response.success) {
                localStorage.setItem('token', response.data.token);
                setUser(response.data.user);
                return { success: true };
            }
            return { success: false, error: response.error };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const register = async (userData) => {
        try {
            const validRoles = ['admin', 'sba', 'viewer'];
            if (userData.role && !validRoles.includes(userData.role)) {
                throw new Error('Invalid role. Must be admin, sba, or viewer');
            }

            const response = await api.register(userData);
            if (response.success) {
                localStorage.setItem('token', response.data.token);
                setUser(response.data.user);
                return { success: true };
            }
            return { success: false, error: response.error };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const getRoleDisplay = (role) => {
        switch (role) {
            case 'admin': return 'Admin';
            case 'sba': return 'SBA';
            case 'viewer': return 'Viewer';
            default: return role;
        }
    };

    const hasPermission = (requiredRole) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        return user.role === requiredRole;
    };

    const canManageSubstation = (substationId) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        if (user.role === 'sba') {
            return user.substationId === substationId;
        }
        return false;
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            register,
            logout,
            getRoleDisplay,
            hasPermission,
            canManageSubstation,
            isAdmin: user?.role === 'admin',
            isSBA: user?.role === 'sba',
            isViewer: user?.role === 'viewer',
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);