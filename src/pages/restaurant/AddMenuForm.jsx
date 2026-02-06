 import React, { useEffect, useMemo, useState, useRef } from 'react';
import menuService from '../../services/menuService';

// Example mapping of main item -> subcategories. In production this should come from API.
const SUBCATS = {
  Rice: ['Chicken Rice', 'Egg Rice', 'Seafood Rice'],
  Kottu: ['Chicken Kottu', 'Cheese Kottu', 'Egg Kottu'],
  Roti: ['Plain Roti', 'Butter Roti'],
  Noodles: ['Chicken Noodles', 'Veg Noodles', 'Seafood Noodles', 'Egg Noodles', 'Spicy Noodles'],
  Curry: ['Chicken Curry', 'Fish Curry', 'Vegetable Curry', 'Beef Curry', 'Prawn Curry', 'Mutton Curry', 'Dal Curry', 'Egg Curry'],
  Drinks: ['King Coconut', 'Lemonade', 'Tea', 'Coffee', 'Milo'],
  Desserts: ['Watalappan', 'Fruit Salad', 'Ice Cream', 'Milk Rice', 'Halapa'],
  Snacks: ['Samosa', 'Cutlets', 'Fish Rolls', 'Vegetable Rolls', 'Patties'],
  Salads: ['Garden Salad', 'Greek Salad', 'Chicken Salad', 'Fruit Salad', 'Coleslaw'],
  Soups: ['Chicken Soup', 'Vegetable Soup', 'Seafood Soup', 'Dal Soup', 'Pumpkin Soup'],
  Appetizers: ['Spring Rolls', 'Chicken Wings', 'Garlic Bread', 'Prawn Tempura', 'Stuffed Mushrooms'],
  Breakfast: ['Eggs & Toast', 'Pancakes', 'Omelette', 'French Toast', 'Milk Rice'],
  Beverages: ['Fresh Juice', 'Iced Tea', 'Soft Drinks', 'Coffee', 'Milkshakes'],
  Seafood: ['Grilled Fish', 'Prawn Curry', 'Crab Curry', 'Fish Cutlets', 'Fish Ambul Thiyal'],
  Vegetarian: ['Vegetable Curry', 'Dal Curry', 'Mixed Vegetable', 'Eggplant Moju', 'Jackfruit Curry'],
  Meat: ['Beef Curry', 'Chicken Curry', 'Mutton Curry', 'Pork Curry', 'Lamb Curry'],
  Breads: ['Naan', 'Paratha', 'Chapati', 'Roti', 'Pita Bread'],
   
  Wraps: ['Chicken Wrap', 'Beef Wrap', 'Veggie Wrap', 'Fish Wrap', 'Falafel Wrap'],
  Specials: ['Chef’s Special Curry', 'Special Fried Rice', 'Signature Kottu', 'Special Roti', 'Daily Special']
};

const AddMenuForm = ({ open, onClose, onSaved, initial = null, onUpdated }) => {
  const [form, setForm] = useState({ name: '', mainItem: '', subCategory: '', price: '', discount: '', availability: 'Available', description: '' });
  const [saving, setSaving] = useState(false);

  // Prefill when opening for edit
  useEffect(() => {
    if (!open) {
      setForm({ name: '', mainItem: '', subCategory: '', price: '', discount: '', availability: 'Available', description: '' });
      return;
    }
    if (open && initial) {
      // try to derive mainItem from subCategory
      const findMain = (sub) => {
        if (!sub) return '';
        for (const [k, arr] of Object.entries(SUBCATS)) {
          if (arr.includes(sub)) return k;
        }
        return '';
      };
      setForm({
        name: initial.name || '',
        mainItem: findMain(initial.subCategory) || '',
        subCategory: initial.subCategory || '',
        price: initial.price !== undefined ? String(initial.price) : '',
        discount: initial.discount !== undefined ? String(initial.discount) : '',
        availability: initial.availability || 'Available',
        description: initial.description || ''
      });
    }
  }, [open, initial]);

  const subs = useMemo(() => SUBCATS[form.mainItem] || [], [form.mainItem]);

  // Keep previous mainItem so we can decide whether to overwrite the name.
  const prevMainRef = useRef('');
  useEffect(() => {
    const prevMain = prevMainRef.current;
    const currentMain = form.mainItem;
    if (!currentMain) {
      prevMainRef.current = currentMain;
      return;
    }
    setForm(f => {
      // If name is empty or it matches previous main, update it to currentMain
      if (!f.name || f.name === prevMain) {
        return { ...f, name: currentMain };
      }
      return f;
    });
    prevMainRef.current = currentMain;
  }, [form.mainItem]);

  const finalPrice = useMemo(() => {
    const p = parseFloat(form.price) || 0;
    const d = parseFloat(String(form.discount || '').replace('%', '')) || 0;
    if (!d) return Number(p.toFixed(2));
    const fp = p - (p * d / 100);
    return Number(fp.toFixed(2));
  }, [form.price, form.discount]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    // validate
    if (!form.name || !form.subCategory || !form.price) {
      return alert('Please fill name, sub-category and price');
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        subCategory: form.subCategory,
        price: Number(parseFloat(form.price)),
        discount: Number(parseFloat(String(form.discount || '').replace('%', '')) || 0),
        finalPrice: finalPrice,
        description: form.description || '',
        availability: form.availability || 'Available'
      };

      if (initial && initial._id) {
        // update flow
        const res = await menuService.updateMenu(initial._id, payload);
        if (res.data && res.data.success) {
          onUpdated && onUpdated(res.data.data);
          alert('Edit menu item success');
          setForm({ name: '', mainItem: '', subCategory: '', price: '', discount: '', availability: 'Available', description: '' });
        } else {
          alert('Failed to update');
        }
      } else {
        const res = await menuService.createMenu(payload);
        if (res.data && res.data.success) {
          onSaved(res.data.data);
          setForm({ name: '', mainItem: '', subCategory: '', price: '', discount: '', availability: 'Available', description: '' });
        } else {
          alert('Failed to save');
        }
      }
    } catch (err) {
      console.error('save menu', err);
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error || err.message || 'Failed to save menu item';
      alert(`Failed to save menu item: ${serverMsg}`);
    }
    setSaving(false);
  };

  return (
    <div className={`transform transition-all duration-300 ${open ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0 pointer-events-none'}`}>
      <div className="bg-white rounded shadow p-4">
        <h3 className="text-lg font-semibold mb-3">Add Menus</h3>
        <form onSubmit={handleSave} className="space-y-3">

          <div>
            <label className="block text-sm font-medium text-gray-700">Main Item</label>
            <select name="mainItem" value={form.mainItem} onChange={handleChange} className="w-full border p-2 rounded">
              <option value="">Select main</option>
              {Object.keys(SUBCATS).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Menu Item Name</label>
            <input name="name" value={form.name} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Sub Category</label>
            <select name="subCategory" value={form.subCategory} onChange={handleChange} className="w-full border p-2 rounded" disabled={!subs.length}>
              <option value="">Select sub-category</option>
              {subs.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Price</label>
              <input name="price" value={form.price} onChange={handleChange} type="number" step="0.01" className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Discount (%)</label>
              <input name="discount" value={form.discount} onChange={handleChange} placeholder="10 or 10%" className="w-full border p-2 rounded" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Final Price</label>
            <div className="w-full border p-2 rounded bg-gray-50">{finalPrice}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} className="w-full border p-2 rounded" rows={3} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Availability</label>
            <select name="availability" value={form.availability} onChange={handleChange} className="w-full border p-2 rounded">
              <option value="Available">Available</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="bg-green-500 text-white px-4 py-2 rounded">{saving ? (initial && initial._id ? 'Updating...' : 'Saving...') : (initial && initial._id ? 'Update' : 'Save')}</button>
            <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded">Close</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMenuForm;
