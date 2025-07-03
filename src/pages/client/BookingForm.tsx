import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Calendar, Clock, MapPin, DollarSign, FileText, Star } from 'lucide-react';
import type { FundiProfile } from '../../types';
import { format, addDays, isSameDay, parse } from 'date-fns';

export function BookingForm() {
  const { fundiId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [fundi, setFundi] = useState<FundiProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    service: '',
    description: '',
    scheduled_date: '',
    scheduled_time: '',
    location: '',
    estimated_hours: 1
  });

  useEffect(() => {
    if (fundiId) {
      fetchFundi();
    }
  }, [fundiId]);

  const fetchFundi = async () => {
    try {
      const { data, error } = await supabase
        .from('fundi_profiles')
        .select(`
          *,
          profiles!fundi_profiles_user_id_fkey(full_name, phone)
        `)
        .eq('user_id', fundiId)
        .single();

      if (error) throw error;
      setFundi(data);
    } catch (error) {
      console.error('Error fetching fundi:', error);
      setError('Failed to load fundi profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !fundi) return;

    setSubmitting(true);
    setError('');

    try {
      const totalAmount = fundi.hourly_rate * formData.estimated_hours;

      const { error: insertError } = await supabase
        .from('bookings')
        .insert({
          client_id: user.id,
          fundi_id: fundi.user_id,
          service: formData.service,
          description: formData.description,
          scheduled_date: formData.scheduled_date,
          scheduled_time: formData.scheduled_time,
          location: formData.location,
          total_amount: totalAmount
        });

      if (insertError) throw insertError;

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  const getAvailableTimeSlots = (date: string) => {
    if (!fundi) return [];
    
    const dayName = format(new Date(date), 'EEEE').toLowerCase();
    const dayAvailability = fundi.availability[dayName as keyof typeof fundi.availability];
    
    if (!dayAvailability?.available) return [];

    const slots = [];
    const startTime = parse(dayAvailability.start, 'HH:mm', new Date());
    const endTime = parse(dayAvailability.end, 'HH:mm', new Date());
    
    let currentTime = startTime;
    while (currentTime < endTime) {
      slots.push(format(currentTime, 'HH:mm'));
      currentTime = new Date(currentTime.getTime() + 60 * 60 * 1000); // Add 1 hour
    }
    
    return slots;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!fundi) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Fundi not found</h2>
          <p className="text-gray-600">The requested fundi profile could not be found.</p>
        </div>
      </div>
    );
  }

  const totalAmount = fundi.hourly_rate * formData.estimated_hours;
  const availableTimeSlots = formData.scheduled_date ? getAvailableTimeSlots(formData.scheduled_date) : [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Fundi Info */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {fundi.profiles?.full_name}
              </h2>
              
              <div className="space-y-3 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  {fundi.location}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Star className="h-4 w-4 text-yellow-400 mr-2" />
                  {fundi.rating.toFixed(1)} ({fundi.total_jobs} jobs)
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <DollarSign className="h-4 w-4 mr-2" />
                  KSH {fundi.hourly_rate}/hour
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Services</h4>
                <div className="flex flex-wrap gap-1">
                  {fundi.services.map((service) => (
                    <span
                      key={service}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>

              {fundi.bio && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">About</h4>
                  <p className="text-sm text-gray-600">{fundi.bio}</p>
                </div>
              )}
            </div>
          </div>

          {/* Booking Form */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Book This Fundi</h1>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Needed
                  </label>
                  <select
                    name="service"
                    required
                    value={formData.service}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a service</option>
                    {fundi.services.map(service => (
                      <option key={service} value={service}>{service}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="inline h-4 w-4 mr-1" />
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe what needs to be done..."
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="inline h-4 w-4 mr-1" />
                      Date
                    </label>
                    <input
                      type="date"
                      name="scheduled_date"
                      required
                      min={format(new Date(), 'yyyy-MM-dd')}
                      max={format(addDays(new Date(), 30), 'yyyy-MM-dd')}
                      value={formData.scheduled_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Clock className="inline h-4 w-4 mr-1" />
                      Time
                    </label>
                    <select
                      name="scheduled_time"
                      required
                      value={formData.scheduled_time}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={!formData.scheduled_date}
                    >
                      <option value="">Select time</option>
                      {availableTimeSlots.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                    {formData.scheduled_date && availableTimeSlots.length === 0 && (
                      <p className="text-sm text-red-600 mt-1">
                        Fundi is not available on this day
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Service Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    required
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Where should the service be performed?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    name="estimated_hours"
                    min="1"
                    max="8"
                    required
                    value={formData.estimated_hours}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Total Cost */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">Total Cost:</span>
                    <span className="text-2xl font-bold text-green-600">
                      KSH {totalAmount.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {formData.estimated_hours} hour(s) × KSH {fundi.hourly_rate}/hour
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting || availableTimeSlots.length === 0}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Creating Booking...' : 'Book Now'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}