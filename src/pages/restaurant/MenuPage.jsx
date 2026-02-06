 import React, { useEffect, useState } from 'react';
import AddMenuForm from './AddMenuForm';
import MenuTable from './MenuTable';
import { Plus } from 'lucide-react';
import menuService from '../../services/menuService';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const MenuPage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [openForm, setOpenForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [restaurantName, setRestaurantName] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await menuService.getMenus();
      // API returns { success: true, data: [...] }
      const all = (res && res.data && res.data.data) ? res.data.data : [];
      if (user && user.role === 'restaurant_owner') {
        const uid = user._id || user.id || user.userId || null;
        if (uid) setItems(all.filter(it => String(it.owner || it.ownerId || it.owner_id || it.owner) === String(uid)));
        else setItems(all);
      } else {
        setItems(all);
      }
    } catch (err) {
      console.error('fetch menus', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    // load restaurant name (for owners) and menus when component mounts / user changes
    const load = async () => {
      if (user && user.role === 'restaurant_owner') {
        try {
          const rres = await api.get('/restaurants/owner/my-restaurants');
          const list = rres?.data?.data || [];
          if (list.length > 0) {
            const r = list[0];
            setRestaurantName(r.name || r.restaurantName || 'My Restaurant');
          }
        } catch (err) {
          console.error('Could not fetch owner restaurant', err);
        }
      }
      await fetchItems();
    };
    load();
  }, [user]);

  const handleSaved = (newItem) => {
    // prepend
    setItems(prev => [newItem, ...prev]);
    setOpenForm(false);
  };

  const handleUpdated = (updatedItem) => {
    setItems(prev => prev.map(it => (it._id === updatedItem._id ? updatedItem : it)));
    setEditingItem(null);
    setOpenForm(false);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setOpenForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this menu item?')) return;
    try {
      await menuService.deleteMenu(id);
      setItems(prev => prev.filter(it => (it._id || it.id) !== id));
    } catch (err) {
      console.error('delete menu', err);
      alert('Failed to delete');
    }
  };

  return (
    <div className="min-h-[70vh]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{restaurantName ? `${restaurantName} - Menu Management` : 'Menu'}</h2>
        {(user && (user.role === 'restaurant_owner' || user.role === 'admin')) && (
          <button onClick={() => setOpenForm(true)} className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded shadow">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Add form will slide in on the left - we render it in the left column when open */}
        <div className="md:col-span-1">
          <div className="h-full">
            <AddMenuForm open={openForm} onClose={() => { setOpenForm(false); setEditingItem(null); }} onSaved={handleSaved} initial={editingItem} onUpdated={handleUpdated} />
          </div>
        </div>

        <div className="md:col-span-3">
          <MenuTable items={items} loading={loading} onRefresh={fetchItems} onEdit={handleEdit} onDelete={handleDelete} />
        </div>
      </div>
    </div>
  );
};

export default MenuPage;
