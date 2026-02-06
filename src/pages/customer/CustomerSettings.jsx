import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const CustomerSettings = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', phoneNumber: '', preferences: {} });

  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.fullName || user.name || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        preferences: user.preferences || {}
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // call backend to save profile (use existing auth service or api)
      // for now just update local context
      updateUser({ ...user, fullName: form.fullName, email: form.email, phoneNumber: form.phoneNumber });
      alert('Settings saved');
    } catch (err) {
      console.error('Save failed', err);
      alert('Could not save settings');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow">
        <h2 className="text-2xl font-bold mb-4">Account Settings</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input name="fullName" value={form.fullName} onChange={handleChange} className="w-full border p-3 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input name="email" value={form.email} onChange={handleChange} className="w-full border p-3 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input name="phoneNumber" value={form.phoneNumber} onChange={handleChange} className="w-full border p-3 rounded-md" />
          </div>

          <div className="flex justify-end">
            <button type="submit" className="bg-orange-500 text-white px-4 py-2 rounded-md">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerSettings;
