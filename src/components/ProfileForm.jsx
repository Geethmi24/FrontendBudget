import React, { useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

const ProfileForm = ({ onClose, onUpdated }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phoneNumber: '', location: '' });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.fullName || user.name || '',
        email: user.email || '',
        password: '',
        phoneNumber: user.phoneNumber || '',
        location: user.location || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName,
        email: form.email,
        password: form.password || undefined,
        phoneNumber: form.phoneNumber,
        location: form.location
      };

      const res = await authService.updateProfile(payload);
      if (res && res.success) {
        onUpdated && onUpdated(res.data);
      } else {
        alert(res.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Profile save error', err);
      alert('Error saving profile');
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          name="fullName"
          value={form.fullName}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          name="email"
          value={form.email}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Password (leave blank to keep)</label>
        <div className="relative">
          <input
            name="password"
            value={form.password}
            onChange={handleChange}
            type={showPassword ? 'text' : 'password'}
            className="w-full border p-2 rounded"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-2 top-2 text-gray-500" aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Address</label>
        <input
          name="location"
          value={form.location}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Contact Number</label>
        <input
          name="phoneNumber"
          value={form.phoneNumber}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="bg-green-500 text-white px-4 py-2 rounded">{saving ? 'Saving...' : 'Save'}</button>
        <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded">Cancel</button>
      </div>
    </form>
  );
};

export default ProfileForm;
