import React from 'react';

const Help = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow">
        <h2 className="text-2xl font-bold mb-4">Help & Support</h2>
        <h3 className="text-lg font-semibold mt-4">Frequently Asked Questions</h3>
        <div className="mt-3 space-y-3">
          <div>
            <strong>How do I search for restaurants by budget?</strong>
            <p className="text-gray-700">Enter your budget on the Budget page and choose a location or use GPS. Then press Search.</p>
          </div>
          <div>
            <strong>How is distance calculated?</strong>
            <p className="text-gray-700">Distance uses restaurant coordinates when available and filters by a small radius (by default 5 km).</p>
          </div>
          <div>
            <strong>How do I contact support?</strong>
            <p className="text-gray-700">Email support@example.com or use the contact form on this page (coming soon).</p>
          </div>
        </div>

        <h3 className="text-lg font-semibold mt-6">Contact Support</h3>
        <p className="text-gray-700 mt-2">If you need help, email <a className="text-orange-600 font-medium" href="mailto:support@example.com">support@example.com</a></p>
      </div>
    </div>
  );
};

export default Help;
