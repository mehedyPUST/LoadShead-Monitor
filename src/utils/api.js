const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const apiCall = async (endpoint, options = {}) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 409) {
                return {
                    success: false,
                    status: response.status,
                    ...data
                };
            }

            if (response.status === 401) {
                localStorage.removeItem('token');
                if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                }
            }
            throw new Error(data.error || 'Something went wrong');
        }

        return data;
    } catch (error) {
        throw error;
    }
};

export const api = {
    // Auth
    login: async (username, password) => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }
        return data;
    },

    register: async (userData) => {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }
        return data;
    },

    logout: async () => {
        const response = await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Logout failed');
        }
        return data;
    },

    getMe: async () => {
        return apiCall('/auth/me');
    },

    // Substations
    getSubstations: async () => {
        return apiCall('/substations');
    },

    getSubstation: async (id) => {
        return apiCall(`/substations/${id}`);
    },

    createSubstation: async (data) => {
        return apiCall('/substations', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Feeders
    getFeeders: async () => {
        return apiCall('/feeders');
    },

    getFeedersBySubstation: async (substationId) => {
        return apiCall(`/feeders/substation/${substationId}`);
    },

    getFeeder: async (id) => {
        return apiCall(`/feeders/${id}`);
    },

    createFeeder: async (data) => {
        return apiCall('/feeders', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    updateFeeder: async (id, data) => {
        return apiCall(`/feeders/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    deleteFeeder: async (id) => {
        return apiCall(`/feeders/${id}`, {
            method: 'DELETE',
        });
    },

    // Records
    getRecords: async (params) => {
        const query = new URLSearchParams(params).toString();
        return apiCall(`/records?${query}`);
    },

    getRecordsBySubstation: async (id, view = 'today') => {
        return apiCall(`/records/substation/${id}?view=${view}`);
    },

    getRecordsBySubstationWithDates: async (id, startDate, endDate) => {
        const params = new URLSearchParams({ startDate, endDate });
        return apiCall(`/records/substation/${id}?${params.toString()}`);
    },

    // ✅ NEW: Get records for a specific feeder with filter
    getRecordsByFeeder: async (feederId, view = 'today') => {
        return apiCall(`/records?feederId=${feederId}&view=${view}`);
    },

    createRecord: async (data) => {
        return apiCall('/records', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    updateRecord: async (id, data) => {
        return apiCall(`/records/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    deleteRecord: async (id) => {
        return apiCall(`/records/${id}`, {
            method: 'DELETE',
        });
    },

    getStatistics: async (substationId, view = 'today') => {
        return apiCall(`/records/statistics/${substationId}?view=${view}`);
    },

    // Admin
    getUsers: async () => {
        return apiCall('/admin/users');
    },

    updateUserRole: async (userId, data) => {
        return apiCall(`/admin/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    changeUserPassword: async (userId, newPassword) => {
        return apiCall(`/admin/users/${userId}/password`, {
            method: 'PUT',
            body: JSON.stringify({ newPassword }),
        });
    },

    deleteUser: async (userId) => {
        return apiCall(`/admin/users/${userId}`, {
            method: 'DELETE',
        });
    },
};