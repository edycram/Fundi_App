import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Search as SearchIcon, MapPin, Star, Clock, Filter } from 'lucide-react';
import type { FundiProfile } from '../../types';

const SERVICES = [
  'All Services',
  'Plumbing',
  'Electrical Work',
  'Carpentry',
  'Painting',
  'Cleaning',
  'Gardening',
  'Home Repairs',
  'HVAC',
  'Roofing',
  'Masonry',
  'Welding',
  'Appliance Repair'
];

export function Search() {
  const [fundis, setFundis] = useState<FundiProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState('All Services');
  const [location, setLocation] = useState('');
  const [sortBy, setSortBy] = useState('rating');

  useEffect(() => {
    fetchFundis();
  }, [selectedService, sortBy]);

  const fetchFundis = async () => {
    try {
      let query = supabase
        .from('fundi_profiles')
        .select(`
          *,
          profiles!fundi_profiles_user_id_fkey(full_name, phone)
        `);

      // Filter by service
      if (selectedService !== 'All Services') {
        query = query.contains('services', [selectedService]);
      }

      // Sort
      if (sortBy === 'rating') {
        query = query.order('rating', { ascending: false });
      } else if (sortBy === 'rate') {
        query = query.order('hourly_rate', { ascending: true });
      } else if (sortBy === 'experience') {
        query = query.order('total_jobs', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      setFundis(data || []);
    } catch (error) {
      console.error('Error fetching fundis:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFundis = fundis.filter(fundi => {
    const nameMatch = fundi.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const locationMatch = location === '' || fundi.location.toLowerCase().includes(location.toLowerCase());
    return nameMatch && locationMatch;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Find Skilled Fundis</h1>
          <p className="text-gray-600 mt-1">
            Discover verified professionals for all your service needs
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {SERVICES.map(service => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>

            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Location..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="rating">Sort by Rating</option>
              <option value="rate">Sort by Rate (Low to High)</option>
              <option value="experience">Sort by Experience</option>
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFundis.map((fundi) => (
            <div key={fundi.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    {fundi.profiles?.full_name}
                  </h3>
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    {fundi.location}
                  </div>
                  <div className="flex items-center mb-3">
                    <Star className="h-4 w-4 text-yellow-400 mr-1" />
                    <span className="text-sm font-medium">{fundi.rating.toFixed(1)}</span>
                    <span className="text-sm text-gray-600 ml-2">
                      ({fundi.total_jobs} jobs)
                    </span>
                    {fundi.is_verified && (
                      <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Verified
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">
                    KSH {fundi.hourly_rate}/hr
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex flex-wrap gap-1">
                  {fundi.services.slice(0, 3).map((service) => (
                    <span
                      key={service}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {service}
                    </span>
                  ))}
                  {fundi.services.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      +{fundi.services.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {fundi.bio && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {fundi.bio}
                </p>
              )}

              <Link
                to={`/book/${fundi.user_id}`}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-center block"
              >
                Book Now
              </Link>
            </div>
          ))}
        </div>

        {filteredFundis.length === 0 && (
          <div className="text-center py-12">
            <SearchIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No fundis found</h3>
            <p className="text-gray-600">
              Try adjusting your search criteria or check back later for new fundis.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}