import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const ReviewsPage = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restaurantId, setRestaurantId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        // fetch owner's restaurant
        const rres = await api.get('/restaurants/owner/my-restaurants');
        const list = rres?.data?.data || [];
        if (list.length === 0) {
          setReviews([]);
          return;
        }
        const rid = list[0]._id || list[0].id;
        setRestaurantId(rid);
        setLoading(true);
        try {
          const resp = await api.get(`/reviews/restaurant/${rid}`);
          const data = resp.data && resp.data.data ? resp.data.data : [];
          setReviews(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error('Could not fetch reviews', err);
          setReviews([]);
        }
      } catch (e) {
        console.error('Failed to load owner restaurant', e);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) return <div>Loading reviews...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Customer Reviews</h2>
        <div className="text-sm text-gray-500">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
      </div>

      {(!reviews || reviews.length === 0) ? (
        <div className="p-6 bg-white rounded text-gray-600">No reviews yet</div>
      ) : (
        <div className="space-y-4">
          {reviews.map(rv => (
            <div key={rv._id || rv.id} className="bg-white p-4 rounded shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-lg font-semibold">
                  { (rv.customerId && (rv.customerId.fullName || rv.customerId.name)) ? (rv.customerId.fullName || rv.customerId.name).charAt(0) : 'U' }
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{rv.customerId ? (rv.customerId.fullName || rv.customerId.name) : (rv.customerName || 'Customer')}</div>
                      <div className="text-xs text-gray-500">{new Date(rv.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="text-sm font-semibold text-yellow-500">{Array.from({length: Math.max(0, Math.min(5, Number(rv.rating) || 0))}).map((_,i)=> '★').join('')}</div>
                  </div>
                  <div className="mt-2 text-gray-700">{rv.comment}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewsPage;
