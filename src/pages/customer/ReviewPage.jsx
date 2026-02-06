import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const ReviewPage = () => {
  const { restaurantId, orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const rres = await api.get(`/restaurants/${restaurantId}`);
        const payload = rres?.data;
        // API may return { data: { restaurant, meals } } or raw restaurant
        const normalized = payload?.data?.restaurant || payload?.data || payload;
        setRestaurant(normalized);
      } catch (e) {
        console.error(e);
      }

      // check existing reviews for this restaurant and order
      try {
        const resp = await api.get(`/reviews/restaurant/${restaurantId}`);
        const list = resp.data && resp.data.data ? resp.data.data : [];
        const found = (list || []).find(rr => String(rr.orderId) === String(orderId));
        if (found) setAlreadyReviewed(true);
      } catch (e) {
        // ignore
      }
    };
    load();
  }, [restaurantId, orderId]);

  const submit = async (e) => {
    e.preventDefault();
    if (alreadyReviewed) return alert('You have already reviewed this order');
    setSubmitting(true);
    try {
      const payload = {
        restaurantId,
        orderId,
        customerId: user && user._id,
        rating: Number(rating),
        comment: (comment || '').trim()
      };
      const res = await api.post('/reviews', payload);
      if (res && res.data && res.data.data) {
        alert('Review submitted. Thank you!');
        // notify other tabs
        window.dispatchEvent(new Event('storageUpdated'));
        navigate(-1);
      } else {
        alert('Could not submit review');
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm text-blue-600">← Back</button>
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-3">Review & Rating</h2>
        {restaurant && (
          <div className="flex items-center gap-4 mb-4">
            <img src={(restaurant.images && restaurant.images[0]) || restaurant.photoURL || (restaurant.restaurant && ((restaurant.restaurant.images && restaurant.restaurant.images[0]) || restaurant.restaurant.photoURL)) || ''} alt="restaurant" className="w-20 h-20 object-cover rounded" />
            <div>
              <div className="font-medium">{restaurant.name || (restaurant.restaurant && restaurant.restaurant.name)}</div>
              <div className="text-sm text-gray-500">{restaurant.location || (restaurant.address && (restaurant.address.street || restaurant.address.city)) || (restaurant.restaurant && (restaurant.restaurant.location || (restaurant.restaurant.address && (restaurant.restaurant.address.street || restaurant.restaurant.address.city))))}</div>
            </div>
          </div>
        )}

        {alreadyReviewed ? (
          <div className="p-4 bg-green-50 rounded">You have already submitted a review for this order.</div>
        ) : (
          <form onSubmit={submit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Rating</label>
              <div className="flex items-center gap-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setRating(n)} className={`text-2xl ${n <= rating ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Comment</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)} className="w-full border rounded p-2" rows={4} />
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded">{submitting ? 'Submitting...' : 'Submit Review'}</button>
              <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-100 rounded">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReviewPage;
