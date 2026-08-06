'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
        } catch (error) { console.error(error); showMessage('error', 'Failed to load data'); }
        finally { setIsLoading(false); }
    };

    const showMessage = (type, text) => { setMessage({ type, text }); setTimeout(() => setMessage({ type: '', text: '' }), 5000); };

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
            const response = await api.updateUserRole(editingUser.id, { role: formData.role, substationId: formData.substationId || null });
            if (response.success) { showMessage('success', 'User updated!'); fetchData(); setTimeout(() => { setShowEditModal(false); setEditingUser(null); }, 1000); }
            else showMessage('error', response.error || 'Update failed');
        } catch (error) { showMessage('error', error.message); }
        finally { setIsSubmitting(false); }
    };

    const validateCreateForm = () => {
        const errors = {};
        if (!createForm.name.trim()) errors.name = 'Name is required';
        if (!createForm.username.trim()) { errors.username = 'Username is required'; } else if (createForm.username.length < 3) { errors.username = 'Username must be at least 3 characters'; }
        if (!createForm.password) { errors.password = 'Password is required'; } else if (createForm.password.length < 6) { errors.password = 'Password must be at least 6 characters'; }
        if (createForm.password !== createForm.confirmPassword) errors.confirmPassword = 'Passwords do not match';
        if (createForm.role === 'sba' && !createForm.substationId) errors.substationId = 'Substation is required for SBA';
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (!validateCreateForm()) return;
        setIsSubmitting(true);
        try {
            const userData = { name: createForm.name.trim(), username: createForm.username.trim().toLowerCase(), email: createForm.username.trim().toLowerCase() + '@system.local', password: createForm.password, role: createForm.role, substationId: createForm.role === 'sba' ? createForm.substationId : null };
            const response = await api.register(userData);
            if (response.success) { showMessage('success', `User "${createForm.username}" created!`); setCreateForm({ name: '', username: '', password: '', confirmPassword: '', role: 'viewer', substationId: '' }); fetchData(); setTimeout(() => setShowCreateModal(false), 1500); }
            else { if (response.error?.includes('already exists')) { setFieldErrors({ username: 'This username is already taken' }); showMessage('error', 'Username already exists'); } else showMessage('error', response.error || 'Creation failed'); }
        } catch (error) { if (error.message?.includes('already exists')) { setFieldErrors({ username: 'This username is already taken' }); showMessage('error', 'Username already exists'); } else showMessage('error', error.message); }
        finally { setIsSubmitting(false); }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            const response = await api.deleteUser(userId);
            if (response.success) { showMessage('success', 'User deleted!'); fetchData(); }
            else showMessage('error', response.error || 'Delete failed');
        } catch (error) { showMessage('error', error.message); }
    };

    const handleResetPassword = (user) => {
        setPasswordResetUser(user);
        setNewPassword('');
        setConfirmNewPassword('');
        setShowPasswordModal(true);
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmNewPassword) { showMessage('error', 'Passwords do not match'); return; }
        if (newPassword.length < 6) { showMessage('error', 'Password must be at least 6 characters'); return; }
        setIsSubmitting(true);
        try {
            const response = await api.changeUserPassword(passwordResetUser.id, newPassword);
            if (response.success) { showMessage('success', `Password for "${passwordResetUser.name}" reset`); setShowPasswordModal(false); setPasswordResetUser(null); }
            else showMessage('error', response.error || 'Password reset failed');
        } catch (error) { showMessage('error', error.message); }
        finally { setIsSubmitting(false); }
    };

    const getSubstationName = (substationId) => {
        if (!substationId) return 'None';
        const ss = substations.find(s => s.id === substationId);
        return ss ? ss.name : 'Unknown';
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'admin': return 'bg-purple-100 text-purple-800';
            case 'sba': return 'bg-blue-100 text-blue-800';
            case 'viewer': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getRoleDisplay = (role) => {
        switch (role) {
            case 'admin': return 'Admin';
            case 'sba': return 'SBA';
            case 'viewer': return 'Viewer';
            default: return role;
        }
    };

    if (loading || isLoading) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">
                    <Spinner size={48} />
                </div>
            </Layout>
        );
    }

    if (!user || user.role !== 'admin') return null;

    return (
        <Layout>
            <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
                <div><h1 className="text-2xl font-bold text-gray-800">👑 Admin Dashboard</h1><p className="text-gray-600">Manage users, roles, and substation assignments</p></div>
                <div className="flex gap-2">
                    <button onClick={() => { setShowCreateModal(true); setMessage({ type: '', text: '' }); setFieldErrors({}); }} className="btn-primary text-sm flex items-center gap-1">➕ Add User</button>
                    <button onClick={fetchData} className="btn-secondary text-sm">🔄 Refresh</button>
                </div>
            </div>
            <AnimatePresence>
                {message.text && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`p-4 rounded-lg mb-6 flex items-center justify-between ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        <span>{message.type === 'success' ? '✅' : '⚠️'} {message.text}</span>
                        <button onClick={() => setMessage({ type: '', text: '' })} className="text-gray-500 hover:text-gray-700">×</button>
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="card p-4 border-l-4 border-purple-500"><p className="text-sm text-gray-600">Total Users</p><p className="text-2xl font-bold text-purple-600">{users.length}</p></div>
                <div className="card p-4 border-l-4 border-blue-500"><p className="text-sm text-gray-600">SBA</p><p className="text-2xl font-bold text-blue-600">{users.filter(u => u.role === 'sba').length}</p></div>
                <div className="card p-4 border-l-4 border-green-500"><p className="text-sm text-gray-600">Admins</p><p className="text-2xl font-bold text-green-600">{users.filter(u => u.role === 'admin').length}</p></div>
                <div className="card p-4 border-l-4 border-orange-500"><p className="text-sm text-gray-600">Viewers</p><p className="text-2xl font-bold text-orange-600">{users.filter(u => u.role === 'viewer').length}</p></div>
            </div>
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Substation</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {users.map((user, index) => (
                                <motion.tr key={user.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.username || user.email?.split('@')[0] || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap"><span className={`badge ${getRoleBadgeColor(user.role)}`}>{getRoleDisplay(user.role)}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.role === 'sba' ? getSubstationName(user.substationId) : '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div className="flex gap-1 flex-wrap">
                                            <button onClick={() => handleEditClick(user)} className="btn-primary text-xs px-2 py-1">✏️ Edit</button>
                                            <button onClick={() => handleResetPassword(user)} className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium hover:bg-yellow-600 transition">🔑 Reset PW</button>
                                            {user.id !== 'me' && <button onClick={() => handleDeleteUser(user.id)} className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium hover:bg-red-600 transition">🗑️ Delete</button>}
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {users.length === 0 && <div className="text-center py-10 text-gray-500">No users found</div>}
            </div>
            {/* Create Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-800">➕ Create New User</h2>
                                <button onClick={() => { setShowCreateModal(false); setMessage({ type: '', text: '' }); setFieldErrors({}); }} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button>
                            </div>
                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label><input type="text" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className={`input-field ${fieldErrors.name ? 'border-red-500' : ''}`} placeholder="John Doe" required /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Username *</label><input type="text" value={createForm.username} onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })} className={`input-field ${fieldErrors.username ? 'border-red-500' : ''}`} placeholder="johndoe" required /><p className="text-xs text-gray-400 mt-1">Min 3 characters, lowercase only</p></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Password * (min 6)</label><input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} className={`input-field ${fieldErrors.password ? 'border-red-500' : ''}`} placeholder="••••••••" required minLength={6} /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label><input type="password" value={createForm.confirmPassword} onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })} className={`input-field ${fieldErrors.confirmPassword ? 'border-red-500' : ''}`} placeholder="••••••••" required /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Role *</label><select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })} className="input-field" required><option value="viewer">Viewer</option><option value="sba">SBA</option></select></div>
                                {createForm.role === 'sba' && (
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Assign Substation *</label><select value={createForm.substationId} onChange={(e) => setCreateForm({ ...createForm, substationId: e.target.value })} className={`input-field ${fieldErrors.substationId ? 'border-red-500' : ''}`} required><option value="">Select Substation</option>{substations.map((ss) => <option key={ss.id} value={ss.id}>{ss.name} ({ss.code})</option>)}</select></div>
                                )}
                                <div className="flex gap-3 pt-2"><button type="button" onClick={() => { setShowCreateModal(false); setMessage({ type: '', text: '' }); setFieldErrors({}); }} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Creating...' : 'Create User'}</button></div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Edit Modal */}
            <AnimatePresence>
                {showEditModal && editingUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
                            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-gray-800">✏️ Edit User: {editingUser.name}</h2><button onClick={() => { setShowEditModal(false); setEditingUser(null); setMessage({ type: '', text: '' }); }} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button></div>
                            <form onSubmit={handleRoleChange} className="space-y-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Role</label><select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="input-field" required><option value="admin">Admin</option><option value="sba">SBA</option><option value="viewer">Viewer</option></select></div>
                                {formData.role === 'sba' && (
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Substation</label><select value={formData.substationId} onChange={(e) => setFormData({ ...formData, substationId: e.target.value })} className="input-field" required={formData.role === 'sba'}><option value="">Select Substation</option>{substations.map((ss) => <option key={ss.id} value={ss.id}>{ss.name} ({ss.code})</option>)}</select><p className="text-xs text-gray-500 mt-1">{formData.substationId ? `Assigned to: ${getSubstationName(formData.substationId)}` : 'Please select a substation'}</p></div>
                                )}
                                <div className="flex gap-3 pt-2"><button type="button" onClick={() => { setShowEditModal(false); setEditingUser(null); setMessage({ type: '', text: '' }); }} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Saving...' : 'Save Changes'}</button></div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Password Reset Modal */}
            <AnimatePresence>
                {showPasswordModal && passwordResetUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
                            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-gray-800">🔑 Reset Password</h2><button onClick={() => { setShowPasswordModal(false); setPasswordResetUser(null); setNewPassword(''); setConfirmNewPassword(''); }} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button></div>
                            <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200"><p className="text-sm text-yellow-700">⚠️ Resetting password for: <strong>{passwordResetUser.name}</strong></p><p className="text-xs text-yellow-600 mt-1">The user will be able to login with the new password immediately.</p></div>
                            <form onSubmit={handlePasswordReset} className="space-y-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">New Password * (min 6)</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field" placeholder="••••••••" required minLength={6} /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password *</label><input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="input-field" placeholder="••••••••" required /></div>
                                <div className="flex gap-3 pt-2"><button type="button" onClick={() => { setShowPasswordModal(false); setPasswordResetUser(null); setNewPassword(''); setConfirmNewPassword(''); }} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={isSubmitting} className="bg-yellow-500 text-white py-2 rounded-lg font-medium hover:bg-yellow-600 transition flex-1 disabled:opacity-50">{isSubmitting ? 'Resetting...' : '🔑 Reset Password'}</button></div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </Layout>
    );
}