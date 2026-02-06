import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';
import { mealService } from '../../services/mealService';
import 'leaflet/dist/leaflet.css';

// Fix default icon paths for bundlers
const DefaultIcon = L.icon({
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const MATARA_CENTER = [5.9480, 80.5350];
const MATARA_BOUNDS = [[5.70, 80.25], [6.20, 80.80]]; // south-west, north-east

const MapPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const passedBudget = state?.budget ?? null;
  const passedFiltered = state?.filteredRestaurants ?? null; // optional
  const selectedRestaurantId = state?.selectedRestaurantId ?? null;

  const [restaurants, setRestaurants] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [geoError, setGeoError] = useState(null);
  const [userPos, setUserPos] = useState(null);

  // Try to get user position (not required) — if denied, we'll still show Matara map
  useEffect(() => {
    if (!navigator.geolocation) return setGeoError('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserPos([latitude, longitude]);
      },
      (err) => {
        setGeoError(err.message || 'Permission denied');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    // If dashboard passed a filtered list, use it; otherwise fetch and filter by budget
    const fetchAndFilter = async () => {
      try {
        if (Array.isArray(passedFiltered) && passedFiltered.length > 0) {
          setRestaurants(passedFiltered);
          return;
        }
        const resp = await api.get('/restaurants?limit=1000');
        const data = resp?.data?.data || resp?.data || [];
        const list = Array.isArray(data) ? data : (data.data || []);
        setRestaurants(list || []);
      } catch (e) {
        console.error('Could not load restaurants', e);
        setRestaurants([]);
      }
    };
    fetchAndFilter();
  }, [passedFiltered]);

  useEffect(() => {
    // filter restaurants by budget and Matara bounds
    if (!restaurants) return;
    const b = Number(passedBudget || 0);
    const matches = (restaurants || []).filter(r => {
      try {
        const min = Number(r.minBudget ?? r.minPrice ?? 0);
        const max = Number(r.maxBudget ?? r.maxPrice ?? 9999999);
        if (b && !(b >= min && b <= max)) return false;
        const lat = Number(r.latitude || (r.location && 0));
        const lng = Number(r.longitude || (r.location && 0));
        if (lat && lng) {
          const inside = lat >= MATARA_BOUNDS[0][0] && lat <= MATARA_BOUNDS[1][0] && lng >= MATARA_BOUNDS[0][1] && lng <= MATARA_BOUNDS[1][1];
          return inside;
        }
        return true;
      } catch (e) {
        return false;
      }
    });
    setFiltered(matches);
  }, [restaurants, passedBudget]);

  // generate deterministic fake positions near Matara for the filtered restaurants
  const fakePositions = useMemo(() => {
    const positions = {};
    const baseLat = MATARA_CENTER[0];
    const baseLng = MATARA_CENTER[1];
    (filtered || []).forEach((r, i) => {
      const offset = 0.003 + (i * 0.0005);
      const angle = (i * 47) % 360;
      const rad = (angle * Math.PI) / 180;
      const lat = baseLat + offset * Math.sin(rad);
      const lng = baseLng + offset * Math.cos(rad);
      positions[r._id || r.id] = [lat, lng];
    });
    return positions;
  }, [filtered]);

  const handleMarkerClick = async (restaurantId) => {
    try {
      const r = (restaurants || []).find(x => String(x._id || x.id) === String(restaurantId));
      // Try menus endpoint first
      try {
        const mresp = await api.get('/menus/public', { params: { restaurant: restaurantId, maxPrice: Number(passedBudget || 0) } });
        const mdata = mresp?.data?.data || mresp?.data || mresp || [];
        const menusList = Array.isArray(mdata) ? mdata : (mdata.data || mdata);
        if (menusList && menusList.length > 0) {
          navigate('/restaurant-result', { state: { results: [r || { _id: restaurantId }], filteredMeals: menusList, filteredMealsMap: { [restaurantId]: menusList }, from: { budget: passedBudget, location: r && (r.location || (r.address && (r.address.street || r.address.city))) }, userCoords: userPos } });
          return;
        }
      } catch (e) {
        // fallthrough to meals
      }

      // fallback to meals API
      try {
        const mealsResp = await mealService.getMeals({ restaurant: restaurantId, maxPrice: Number(passedBudget || 0) });
        const mealsData = mealsResp?.data || mealsResp || [];
        const mealsList = Array.isArray(mealsData) ? mealsData : (mealsData.data || mealsData);
        if (mealsList && mealsList.length > 0) {
          navigate('/restaurant-result', { state: { results: [r || { _id: restaurantId }], filteredMeals: mealsList, filteredMealsMap: { [restaurantId]: mealsList }, from: { budget: passedBudget, location: r && (r.location || (r.address && (r.address.street || r.address.city))) }, userCoords: userPos } });
          return;
        }
      } catch (e) {
        // ignore
      }

      // If no items under budget, show a friendly message
      alert('No menu items under that budget for the selected restaurant');
    } catch (err) {
      console.error('Marker click handler failed', err);
      navigate('/restaurant-result', { state: { restaurantId } });
    }
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-3">Restaurants in Matara</h2>
        {geoError && (
          <div className="mb-3 text-sm text-yellow-700">GPS unavailable: {geoError}. Showing Matara area.</div>
        )}

        <div style={{ height: '70vh' }} className="rounded-lg overflow-hidden shadow">
          <MapContainer
            center={MATARA_CENTER}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            maxBounds={MATARA_BOUNDS}
            maxBoundsViscosity={1.0}
            minZoom={11}
            maxZoom={17}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />

            {(filtered || []).map((r) => {
              const id = r._id || r.id;
              const pos = fakePositions[id] || MATARA_CENTER;
              return (
                <Marker key={id} position={pos} eventHandlers={{ click: () => handleMarkerClick(id) }}>
                  <Tooltip direction="right" offset={[12, 0]} permanent className="!bg-white !text-gray-900 !rounded shadow">
                    {r.name}
                  </Tooltip>
                  <Popup>
                          <div className="font-bold flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-orange-500" />
                            <span>{r.name}</span>
                          </div>
                          <div className="text-sm mt-1 text-gray-900">{r.location || (r.address && (r.address.street || r.address.city))}</div>
                          <div className="text-sm mt-1">Budget: LKR {r.minBudget ?? '-'} - {r.maxBudget ?? '-'}</div>
                          <div className="mt-2">
                            <button onClick={() => handleMarkerClick(id)} className="px-3 py-1 bg-orange-500 text-white rounded">View Details</button>
                          </div>
                        </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {(!filtered || filtered.length === 0) && (
          <div className="mt-4 text-sm text-gray-600">No restaurants match the provided budget in Matara.</div>
        )}
      </div>
    </div>
  );
};

export default MapPage;
