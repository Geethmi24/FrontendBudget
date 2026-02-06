import React from 'react';

const MenuTable = ({ items = [], loading, onRefresh, onEdit, onDelete, compact = false, onOrder, onCancel, onDownload, orderedMap = {}, quantities = {}, onQuantityChange = () => {} }) => {
  // Ensure items is always an array to avoid runtime errors
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div className="bg-white rounded shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Menu Items</h3>
        <div>
          <button onClick={onRefresh} className="text-sm text-gray-600">Refresh</button>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-sm text-gray-500">
                {compact ? (
                  <>
                    <th className="py-2">Name</th>
                    <th className="py-2">Type</th>
                    <th className="py-2">Price</th>
                    <th className="py-2">Discount</th>
                    <th className="py-2">Final Price</th>
                    <th className="py-2">Quantity</th>
                    <th className="py-2">Total</th>
                    <th className="py-2">Actions</th>
                  </>
                ) : (
                  <>
                    <th className="py-2">Name</th>
                    <th className="py-2">Sub Category</th>
                    <th className="py-2">Price</th>
                    <th className="py-2">Discount</th>
                    <th className="py-2">Final</th>
                    <th className="py-2">Availability</th>
                    <th className="py-2">Created</th>
                    <th className="py-2">Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {safeItems.map(it => {
                const final = it.finalPrice != null ? Number(it.finalPrice) : (Number(it.price || 0) - Number(it.discount || 0));
                return (
                  <tr key={it._id || it.id} className="border-t">
                    {compact ? (
                      <>
                        <td className="py-3">
                          {(() => {
                            const key = it._id || it.id || it.name;
                            const st = orderedMap && orderedMap[key];
                            if (st) {
                              const cls = st === 'pending' ? 'bg-yellow-100 text-yellow-800' : st === 'approved' ? 'bg-blue-100 text-blue-800' : st === 'in_process' ? 'bg-purple-100 text-purple-800' : st === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
                              return (
                                <>
                                  <span className={`inline-block mr-2 px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>{String(st).toUpperCase()}</span>
                                  {it.name}
                                </>
                              );
                            }
                            return it.name;
                          })()}
                        </td>
                        <td className="py-3">{it.subCategory || it.type || it.category || '-'}</td>
                        <td className="py-3">LKR {Number(it.price || 0)}</td>
                        <td className="py-3">{it.discount != null ? it.discount : 0}%</td>
                        <td className="py-3">LKR {final}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => onQuantityChange(it._id || it.id || it.name, Math.max(0, (quantities[it._id || it.id || it.name] || 1) - 1))} className="px-2 py-1 bg-gray-100 rounded">-</button>
                            <input type="number" min="0" value={quantities[it._id || it.id || it.name] || 1} onChange={(e) => onQuantityChange(it._id || it.id || it.name, Math.max(0, Number(e.target.value || 0)))} className="w-16 text-center border rounded px-2 py-1" />
                            <button onClick={() => onQuantityChange(it._id || it.id || it.name, (quantities[it._id || it.id || it.name] || 1) + 1)} className="px-2 py-1 bg-gray-100 rounded">+</button>
                          </div>
                        </td>
                        <td className="py-3">LKR {((quantities[it._id || it.id || it.name] || 1) * final)}</td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            {(() => {
                              const key = it._id || it.id || it.name;
                              const st = orderedMap && orderedMap[key];
                              if (st === 'pending') return <button onClick={() => onCancel && onCancel(it)} className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm">Cancel</button>;
                              if (st === 'completed' || st === 'rejected') return <button onClick={() => onDownload && onDownload(it)} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-sm">Download PDF</button>;
                              const qty = quantities[key] || 1;
                              const disabled = qty <= 0;
                              return <button disabled={disabled} onClick={() => onOrder && onOrder(it, qty)} className={`px-3 py-1 rounded text-sm ${disabled ? 'bg-gray-200 text-gray-400' : 'bg-green-100 text-green-700'}`}>Order</button>;
                            })()}
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3">{it.name}</td>
                        <td className="py-3">{it.subCategory || '-'}</td>
                        <td className="py-3">{it.price}</td>
                        <td className="py-3">{it.discount || 0}%</td>
                        <td className="py-3">{it.finalPrice}</td>
                        <td className="py-3">{it.availability || 'Available'}</td>
                        <td className="py-3">{it.createdAt ? new Date(it.createdAt).toLocaleString() : '-'}</td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <button onClick={() => onEdit && onEdit(it)} className="text-sm bg-yellow-100 px-3 py-1 rounded">Edit</button>
                            <button onClick={() => onDelete && onDelete(it._id || it.id)} className="text-sm bg-red-100 px-3 py-1 rounded">Delete</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MenuTable;
