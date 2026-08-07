'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Shield,
    Plus,
    RefreshCw,
    Pencil,
    KeyRound,
    Trash2,
    Users,
    UserCog,
    Eye,
    X,
    AlertTriangle,
    CheckCircle2
} from 'lucide-react';
import Layout from '@/components/common/Layout';
import Spinner from '@/components/common/Spinner';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDashboard() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [users, setUsers] = useState([]);
    const [substations, setSubstations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordResetUser, setPasswordResetUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [formData, setFormData] = useState({ role: '', substationId: '' });
    const [createForm, setCreateForm] = useState({ name: '', username: '', password: '', confirmPassword: '', role: 'viewer', substationId: '' });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => {
        if (!loading && (!user || user.role !== 'admin')) router.push('/');
    }, [loading, user, router]);

    useEffect(() => {
        if (user && user.role === 'admin') fetchData();
    }, [user]);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const usersRes = await api.getUsers();
            if (usersRes.success) setUsers(usersRes.data);
            const substationsRes = await api.getSubstations();
            if (substationsRes.success) setSubstations(substationsRes.data);
        } catch (error) {
            console.error(error);
            showMessage('error', 'Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    };

    const handleEditClick = (user) => {
        setEditingUser(user);
        setFormData({ role: user.role, substationId: user.substationId || '' });
        setShowEditModal(true);
        setMessage({ type: '', text: '' });
        setFieldErrors({});
    };

    const handleRoleChange = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const response = await api.updateUserRole(editingUser.id, {
                role: formData.role,
                substationId: formData.substationId || null,
            });
            if (response.success) {
                showMessage('success', 'User updated!');
                fetchData();
                setTimeout(() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                }, 1000);
            } else {
                showMessage('error', response.error || 'Update failed');
            }
        } catch (error) {
            showMessage('error', error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const validateCreateForm = () => {
        const errors = {};
        if (!createForm.name.trim()) errors.name = 'Name is required';
        if (!createForm.username.trim()) {
            errors.username = 'Username is required';
        } else if (createForm.username.length < 3) {
            errors.username = 'Username must be at least 3 characters';
        }
        if (!createForm.password) {
            errors.password = 'Password is required';
        } else if (createForm.password.length < 6) {
            errors.password = 'Password must be at least 6 characters';
        }
        if (createForm.password !== createForm.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }
        if (createForm.role === 'sba' && !createForm.substationId) {
            errors.substationId = 'Substation is required for SBA';
        }
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (!validateCreateForm()) return;
        setIsSubmitting(true);
        try {
            const userData = {
                name: createForm.name.trim(),
                username: createForm.username.trim().toLowerCase(),
                email: createForm.username.trim().toLowerCase() + '@system.local',
                password: createForm.password,
                role: createForm.role,
                substationId: createForm.role === 'sba' ? createForm.substationId : null,
            };
            const response = await api.register(userData);
            if (response.success) {
                showMessage('success', `User "${createForm.username}" created!`);
                setCreateForm({
                    name: '',
                    username: '',
                    password: '',
                    confirmPassword: '',
                    role: 'viewer',
                    substationId: '',
                });
                fetchData();
                setTimeout(() => setShowCreateModal(false), 1500);
            } else {
                if (response.error?.includes('already exists')) {
                    setFieldErrors({ username: 'This username is already taken' });
                    showMessage('error', 'Username already exists');
                } else {
                    showMessage('error', response.error || 'Creation failed');
                }
            }
        } catch (error) {
            if (error.message?.includes('already exists')) {
                setFieldErrors({ username: 'This username is already taken' });
                showMessage('error', 'Username already exists');
            } else {
                showMessage('error', error.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            const response = await api.deleteUser(userId);
            if (response.success) {
                showMessage('success', 'User deleted!');
                fetchData();
            } else {
                showMessage('error', response.error || 'Delete failed');
            }
        } catch (error) {
            showMessage('error', error.message);
        }
    };

    const handleResetPassword = (user) => {
        setPasswordResetUser(user);
        setNewPassword('');
        setConfirmNewPassword('');
        setShowPasswordModal(true);
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmNewPassword) {
            showMessage('error', 'Passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            showMessage('error', 'Password must be at least 6 characters');
            return;
        }
        setIsSubmitting(true);
        try {
            const response = await api.changeUserPassword(passwordResetUser.id, newPassword);
            if (response.success) {
                showMessage('success', `Password for "${passwordResetUser.name}" reset`);
                setShowPasswordModal(false);
                setPasswordResetUser(null);
            } else {
                showMessage('error', response.error || 'Password reset failed');
            }
        } catch (error) {
            showMessage('error', error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getSubstationName = (substationId) => {
        if (!substationId) return 'None';
        const ss = substations.find((s) => s.id === substationId);
        return ss ? ss.name : 'Unknown';
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'admin':
                return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'sba':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'viewer':
                return 'bg-gray-50 text-gray-700 border-gray-200';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    const getRoleDisplay = (role) => {
        switch (role) {
            case 'admin':
                return 'Admin';
            case 'sba':
                return 'SBA';
            case 'viewer':
                return 'Viewer';
            default:
                return role;
        }
    };

    if (loading || isLoading) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">
                    <Spinner />
                </div>
            </Layout>
        );
    }

    if (!user || user.role !== 'admin') return null;

    return (
        <Layout>
            {/* Header */}
            <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-100 text-purple-700">
                        <Shield size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                            Admin Dashboard
                        </h1>
                        <p className="text-sm text-gray-500">
                            Manage users, roles, and substation assignments
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setShowCreateModal(true);
                            setMessage({ type: '', text: '' });
                            setFieldErrors({});
                        }}
                        className="inline-flex items-center gap-1.5 text-sm font-medium bg-emerald-600 text-white px-3.5 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                        <Plus size={15} />
                        Add User
                    </button>
                    <button
                        onClick={fetchData}
                        className="inline-flex items-center gap-1.5 text-sm font-medium bg-white border border-gray-200 text-gray-700 px-3.5 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw size={15} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Message Toast */}
            <AnimatePresence>
                {message.text && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`p-4 rounded-xl mb-6 flex items-center justify-between border ${message.type === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                    >
                        <span className="flex items-center gap-2 text-sm font-medium">
                            {message.type === 'success' ? (
                                <CheckCircle2 size={16} />
                            ) : (
                                <AlertTriangle size={16} />
                            )}
                            {message.text}
                        </span>
                        <button
                            onClick={() => setMessage({ type: '', text: '' })}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                    {
                        label: 'Total Users',
                        value: users.length,
                        icon: Users,
                        color: 'border-purple-500 bg-purple-50/50',
                        iconBg: 'bg-purple-100 text-purple-600',
                        valueColor: 'text-purple-700',
                    },
                    {
                        label: 'SBA',
                        value: users.filter((u) => u.role === 'sba').length,
                        icon: UserCog,
                        color: 'border-blue-500 bg-blue-50/50',
                        iconBg: 'bg-blue-100 text-blue-600',
                        valueColor: 'text-blue-700',
                    },
                    {
                        label: 'Admins',
                        value: users.filter((u) => u.role === 'admin').length,
                        icon: Shield,
                        color: 'border-emerald-500 bg-emerald-50/50',
                        iconBg: 'bg-emerald-100 text-emerald-600',
                        valueColor: 'text-emerald-700',
                    },
                    {
                        label: 'Viewers',
                        value: users.filter((u) => u.role === 'viewer').length,
                        icon: Eye,
                        color: 'border-orange-500 bg-orange-50/50',
                        iconBg: 'bg-orange-100 text-orange-600',
                        valueColor: 'text-orange-700',
                    },
                ].map((card) => {
                    const Icon = card.icon;
                    return (
                        <div
                            key={card.label}
                            className={`rounded-xl border border-gray-100 border-l-4 ${card.color} p-4 shadow-sm`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${card.iconBg}`}>
                                    <Icon size={16} />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                                        {card.label}
                                    </p>
                                    <p className={`text-2xl font-bold tabular-nums ${card.valueColor}`}>
                                        {card.value}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/80 border-b border-gray-100">
                            <tr>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Username
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Substation
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map((user, index) => (
                                <motion.tr
                                    key={user.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25, delay: index * 0.04 }}
                                    className="hover:bg-gray-50/70 transition-colors"
                                >
                                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {user.name}
                                    </td>
                                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">
                                        {user.username || user.email?.split('@')[0] || 'N/A'}
                                    </td>
                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(
                                                user.role
                                            )}`}
                                        >
                                            {getRoleDisplay(user.role)}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">
                                        {user.role === 'sba' ? getSubstationName(user.substationId) : '—'}
                                    </td>
                                    <td className="px-5 py-3.5 whitespace-nowrap text-sm">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <button
                                                onClick={() => handleEditClick(user)}
                                                className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                                            >
                                                <Pencil size={12} />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleResetPassword(user)}
                                                className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 px-2.5 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                                            >
                                                <KeyRound size={12} />
                                                Reset PW
                                            </button>
                                            {user.id !== 'me' && (
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="inline-flex items-center gap-1 text-xs font-medium bg-red-50 text-red-700 px-2.5 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                                                >
                                                    <Trash2 size={12} />
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {users.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <Users size={28} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No users found</p>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Plus size={18} className="text-emerald-600" />
                                    Create New User
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setMessage({ type: '', text: '' });
                                        setFieldErrors({});
                                    }}
                                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={createForm.name}
                                        onChange={(e) =>
                                            setCreateForm({ ...createForm, name: e.target.value })
                                        }
                                        className={`input-field ${fieldErrors.name ? 'border-red-500' : ''}`}
                                        placeholder="John Doe"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Username *
                                    </label>
                                    <input
                                        type="text"
                                        value={createForm.username}
                                        onChange={(e) =>
                                            setCreateForm({ ...createForm, username: e.target.value })
                                        }
                                        className={`input-field ${fieldErrors.username ? 'border-red-500' : ''}`}
                                        placeholder="johndoe"
                                        required
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        Min 3 characters, lowercase only
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Password * (min 6)
                                    </label>
                                    <input
                                        type="password"
                                        value={createForm.password}
                                        onChange={(e) =>
                                            setCreateForm({ ...createForm, password: e.target.value })
                                        }
                                        className={`input-field ${fieldErrors.password ? 'border-red-500' : ''}`}
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Confirm Password *
                                    </label>
                                    <input
                                        type="password"
                                        value={createForm.confirmPassword}
                                        onChange={(e) =>
                                            setCreateForm({
                                                ...createForm,
                                                confirmPassword: e.target.value,
                                            })
                                        }
                                        className={`input-field ${fieldErrors.confirmPassword ? 'border-red-500' : ''
                                            }`}
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Role *
                                    </label>
                                    <select
                                        value={createForm.role}
                                        onChange={(e) =>
                                            setCreateForm({ ...createForm, role: e.target.value })
                                        }
                                        className="input-field"
                                        required
                                    >
                                        <option value="viewer">Viewer</option>
                                        <option value="sba">SBA</option>
                                    </select>
                                </div>
                                {createForm.role === 'sba' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Assign Substation *
                                        </label>
                                        <select
                                            value={createForm.substationId}
                                            onChange={(e) =>
                                                setCreateForm({
                                                    ...createForm,
                                                    substationId: e.target.value,
                                                })
                                            }
                                            className={`input-field ${fieldErrors.substationId ? 'border-red-500' : ''
                                                }`}
                                            required
                                        >
                                            <option value="">Select Substation</option>
                                            {substations.map((ss) => (
                                                <option key={ss.id} value={ss.id}>
                                                    {ss.name} ({ss.code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowCreateModal(false);
                                            setMessage({ type: '', text: '' });
                                            setFieldErrors({});
                                        }}
                                        className="btn-secondary flex-1"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="btn-primary flex-1"
                                    >
                                        {isSubmitting ? 'Creating...' : 'Create User'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {showEditModal && editingUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                        >
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Pencil size={18} className="text-blue-600" />
                                    Edit User: {editingUser.name}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingUser(null);
                                        setMessage({ type: '', text: '' });
                                    }}
                                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleRoleChange} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Role
                                    </label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) =>
                                            setFormData({ ...formData, role: e.target.value })
                                        }
                                        className="input-field"
                                        required
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="sba">SBA</option>
                                        <option value="viewer">Viewer</option>
                                    </select>
                                </div>
                                {formData.role === 'sba' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Substation
                                        </label>
                                        <select
                                            value={formData.substationId}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    substationId: e.target.value,
                                                })
                                            }
                                            className="input-field"
                                            required={formData.role === 'sba'}
                                        >
                                            <option value="">Select Substation</option>
                                            {substations.map((ss) => (
                                                <option key={ss.id} value={ss.id}>
                                                    {ss.name} ({ss.code})
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {formData.substationId
                                                ? `Assigned to: ${getSubstationName(formData.substationId)}`
                                                : 'Please select a substation'}
                                        </p>
                                    </div>
                                )}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowEditModal(false);
                                            setEditingUser(null);
                                            setMessage({ type: '', text: '' });
                                        }}
                                        className="btn-secondary flex-1"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="btn-primary flex-1"
                                    >
                                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Password Reset Modal */}
            <AnimatePresence>
                {showPasswordModal && passwordResetUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                        >
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <KeyRound size={18} className="text-amber-600" />
                                    Reset Password
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        setPasswordResetUser(null);
                                        setNewPassword('');
                                        setConfirmNewPassword('');
                                    }}
                                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="mb-4 p-3.5 bg-amber-50 rounded-xl border border-amber-200">
                                <p className="text-sm text-amber-800 flex items-start gap-2">
                                    <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                                    <span>
                                        Resetting password for:{' '}
                                        <strong>{passwordResetUser.name}</strong>
                                        <br />
                                        <span className="text-xs text-amber-600">
                                            The user will be able to login with the new password
                                            immediately.
                                        </span>
                                    </span>
                                </p>
                            </div>
                            <form onSubmit={handlePasswordReset} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        New Password * (min 6)
                                    </label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="input-field"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Confirm New Password *
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmNewPassword}
                                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                                        className="input-field"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowPasswordModal(false);
                                            setPasswordResetUser(null);
                                            setNewPassword('');
                                            setConfirmNewPassword('');
                                        }}
                                        className="btn-secondary flex-1"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="inline-flex items-center justify-center gap-1.5 flex-1 bg-amber-500 text-white py-2 rounded-lg font-medium hover:bg-amber-600 transition disabled:opacity-50"
                                    >
                                        <KeyRound size={15} />
                                        {isSubmitting ? 'Resetting...' : 'Reset Password'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </Layout>
    );
}