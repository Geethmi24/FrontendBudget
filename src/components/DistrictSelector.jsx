import React, { useState, useMemo } from 'react';

const DISTRICTS = [
  'Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle','Gampaha','Hambantota','Jaffna','Kalutara',
  'Kandy','Kegalle','Kilinochchi','Kurunegala','Mannar','Matale','Matara','Monaragala','Mullaitivu','Nuwara Eliya',
  'Polonnaruwa','Puttalam','Ratnapura','Trincomalee','Vavuniya'
];

const DistrictSelector = ({ value, onChange }) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = String(query || '').toLowerCase().trim();
    if (!q) return DISTRICTS;
    return DISTRICTS.filter(d => d.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm">
      <label className="block text-sm font-medium text-gray-700 mb-2">Select District</label>
      <input
        placeholder="Search districts..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full border p-2 rounded mb-2"
      />

      <div className="max-h-40 overflow-auto">
        {filtered.map(d => (
          <button
            key={d}
            type="button"
            onClick={() => onChange(d)}
            className={`w-full text-left px-3 py-2 rounded mb-1 hover:bg-gray-100 transition ${value === d ? 'bg-orange-50 border border-orange-200' : ''}`}
          >
            {d}
          </button>
        ))}
      </div>

      {value && (
        <div className="mt-3 text-sm text-gray-600">Selected: <strong className="text-gray-800">{value}</strong></div>
      )}
    </div>
  );
};

export default DistrictSelector;
