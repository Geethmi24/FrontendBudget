import React, { useState, useEffect } from 'react'
import { Edit2, Trash2, Plus, ChevronUp, ChevronDown } from 'lucide-react'
import api from '../../services/api'

const AdminMenuPage = ({ adminToken }) => {
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [expandedRestaurants, setExpandedRestaurants] = useState({})
  const [formData, setFormData] = useState({
    name: '',
    subCategory: '',
    price: '',
    discount: '',
    availability: 'Available',
    description: ''
  })

  // Fetch all menu items
  const fetchMenuItems = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin-menus', {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      console.log('Menu response:', response.data)
      
      let items = []
      if (response.data?.data && Array.isArray(response.data.data)) {
        items = response.data.data
      } else if (Array.isArray(response.data)) {
        items = response.data
      }
      
      setMenuItems(items)
    } catch (err) {
      console.error('Failed to fetch menu items:', err)
      console.error('Error details:', err.response?.data)
      alert(`Failed to load menu items: ${err.response?.data?.message || err.message}`)
      setMenuItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (adminToken) {
      fetchMenuItems()
    }
  }, [adminToken])

  // Group menu items by restaurant
  const groupedByRestaurant = menuItems.reduce((acc, item) => {
    const restName = item.restaurantName || 'Unknown Restaurant'
    if (!acc[restName]) {
      acc[restName] = []
    }
    acc[restName].push(item)
    return acc
  }, {})

  const handleAddClick = () => {
    setEditingItem(null)
    setFormData({
      name: '',
      subCategory: '',
      price: '',
      discount: '',
      availability: 'Available',
      description: ''
    })
    setShowForm(true)
  }

  const handleEditClick = (item) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      subCategory: item.subCategory,
      price: item.price,
      discount: item.discount || 0,
      availability: item.availability,
      description: item.description || ''
    })
    setShowForm(true)
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const payload = {
        name: formData.name,
        subCategory: formData.subCategory,
        price: parseFloat(formData.price),
        discount: parseFloat(formData.discount) || 0,
        availability: formData.availability,
        description: formData.description
      }

      if (editingItem) {
        // Update
        const response = await api.put(`/admin-menus/${editingItem._id}`, payload, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
        console.log('Update response:', response.data)
        
        if (response.data?.data || response.data?.success) {
          const updatedItem = response.data.data || editingItem
          setMenuItems(prev => prev.map(item => 
            item._id === editingItem._id ? updatedItem : item
          ))
          alert('Menu item updated successfully')
        }
      } else {
        alert('Admin cannot create standalone menu items. Menu items are created by restaurant owners.')
      }

      setShowForm(false)
      setEditingItem(null)
      setFormData({
        name: '',
        subCategory: '',
        price: '',
        discount: '',
        availability: 'Available',
        description: ''
      })
    } catch (err) {
      console.error('Failed to save menu item:', err)
      console.error('Error details:', err.response?.data)
      alert(`Failed to save menu item: ${err.response?.data?.message || err.message}`)
    }
  }

  const handleDelete = async (itemId) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return

    try {
      await api.delete(`/admin-menus/${itemId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      setMenuItems(prev => prev.filter(item => item._id !== itemId))
      alert('Menu item deleted successfully')
    } catch (err) {
      console.error('Failed to delete menu item:', err)
      alert(`Failed to delete menu item: ${err.response?.data?.message || err.message}`)
    }
  }

  const toggleRestaurant = (restName) => {
    setExpandedRestaurants(prev => ({
      ...prev,
      [restName]: !prev[restName]
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Menu Management</h1>
          <button
            onClick={handleAddClick}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Edit Menu Items
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">
              {editingItem ? 'Edit Menu Item' : 'Add Menu Item (Owner Only)'}
            </h2>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Item Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Sub Category</label>
                  <input
                    type="text"
                    name="subCategory"
                    value={formData.subCategory}
                    onChange={handleFormChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Price</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleFormChange}
                    step="0.01"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Discount (%)</label>
                  <input
                    type="number"
                    name="discount"
                    value={formData.discount}
                    onChange={handleFormChange}
                    step="0.01"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Availability</label>
                  <select
                    name="availability"
                    value={formData.availability}
                    onChange={handleFormChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>Available</option>
                    <option>Out of Stock</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  rows="3"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  {editingItem ? 'Update Item' : 'Save Item'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingItem(null)
                  }}
                  className="bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Menu Items by Restaurant */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading menu items...</p>
          </div>
        ) : Object.keys(groupedByRestaurant).length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 text-lg">No menu items found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByRestaurant).map(([restName, items]) => (
              <div key={restName} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div
                  onClick={() => toggleRestaurant(restName)}
                  className="bg-blue-600 text-white p-4 cursor-pointer hover:bg-blue-700 flex justify-between items-center"
                >
                  <h3 className="text-xl font-bold">{restName}</h3>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                      {items.length} items
                    </span>
                    {expandedRestaurants[restName] ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </div>

                {expandedRestaurants[restName] && (
                  <div className="p-4">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold">Name</th>
                            <th className="px-4 py-2 text-left font-semibold">Category</th>
                            <th className="px-4 py-2 text-left font-semibold">Price</th>
                            <th className="px-4 py-2 text-left font-semibold">Discount</th>
                            <th className="px-4 py-2 text-left font-semibold">Final Price</th>
                            <th className="px-4 py-2 text-left font-semibold">Availability</th>
                            <th className="px-4 py-2 text-left font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map(item => (
                            <tr key={item._id} className="border-t hover:bg-gray-50">
                              <td className="px-4 py-3">{item.name}</td>
                              <td className="px-4 py-3">{item.subCategory}</td>
                              <td className="px-4 py-3">LKR {item.price.toFixed(2)}</td>
                              <td className="px-4 py-3">{item.discount}%</td>
                              <td className="px-4 py-3 font-semibold">LKR {item.finalPrice.toFixed(2)}</td>
                              <td className="px-4 py-3">
                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                  item.availability === 'Available' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {item.availability}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditClick(item)}
                                    className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(item._id)}
                                    className="p-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminMenuPage
