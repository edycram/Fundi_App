import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, MapPin, Star, Check, X, AlertCircle, Gift, AlertTriangle } from 'lucide-react';
import type { Booking, FundiProfile } from '../types';
import { format } from 'date-fns';
import { LoyaltyCard } from '../components/LoyaltyCard';
import { LoyaltyTransactions } from '../components/LoyaltyTransactions';
import { RedeemPointsModal } from '../components/RedeemPointsModal';
import { DisputeForm } from '../components/DisputeForm';
import { useLoyalty } from '../hooks/useLoyalty';

export function Dashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [fundiProfile, setFundiProfile] = useState<FundiProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState<string | null>(null);
  
  const { loyaltySummary, loading: loyaltyLoading, refreshLoyalty } = useLoyalty();

  useEffect(() => {
    if (user) {
      fetchBookings();
      if (user.profile?.role === 'fundi') {
        fetchFundiProfile();
      }
    }
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;

    try {
      const query = supabase
        .from('bookings')
        .select(`
          *,
          client:profiles!bookings_client_id_fkey(full_name, phone),
          fundi:profiles!bookings_fundi_id_fkey(full_name, phone)
        `)
        .order('created_at', { ascending: false });

      if (user.profile?.role === 'client') {
        query.eq('client_id', user.id);
      } else {
        query.eq('fundi_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFundiProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('fundi_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setFundiProfile(data);
    } catch (error) {
      console.error('Error fetching fundi profile:', error);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;
      
      // Refresh bookings
      fetchBookings();
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  };

  const markBookingCompleted = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId);

      if (error) throw error;
      
      // Refresh bookings and loyalty data
      fetchBookings();
      refreshLoyalty();
    } catch (error) {
      console.error('Error marking booking as completed:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      case 'expired': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canSubmitDispute = (booking: Booking) => {
    // Can submit dispute if booking is completed, rejected, or has payment issues
    return ['completed', 'rejected'].includes(booking.status) || 
           booking.payment_status === 'failed';
  };

  if (loading || loyaltyLoading) {
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
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.profile?.full_name}
          </h1>
          <p className="text-gray-600 mt-1">
            {user?.profile?.role === 'client' ? 'Manage your bookings and loyalty rewards' : 'Manage your job requests'}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Fundi Profile Card */}
            {user?.profile?.role === 'fundi' && fundiProfile && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Your Profile</h2>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 mr-1" />
                        <span>{fundiProfile.rating.toFixed(1)} rating</span>
                      </div>
                      <div>{fundiProfile.total_jobs} jobs completed</div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {fundiProfile.location}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      KSH {fundiProfile.hourly_rate}/hr
                    </div>
                    <div className="text-sm text-gray-600">
                      {fundiProfile.services.length} services offered
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bookings List */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {user?.profile?.role === 'client' ? 'Your Bookings' : 'Job Requests'}
                </h2>
              </div>

              {bookings.length === 0 ? (
                <div className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {user?.profile?.role === 'client' ? 'No bookings yet' : 'No job requests yet'}
                  </h3>
                  <p className="text-gray-600">
                    {user?.profile?.role === 'client' 
                      ? 'Start by searching for fundis and booking their services.'
                      : 'Job requests will appear here when clients book your services.'
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-900">
                              {booking.service}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                              {booking.status}
                            </span>
                          </div>
                          
                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              {format(new Date(booking.scheduled_date), 'MMMM dd, yyyy')} at {booking.scheduled_time}
                            </div>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2" />
                              {booking.location}
                            </div>
                            {user?.profile?.role === 'client' ? (
                              <div>Fundi: {booking.fundi?.full_name}</div>
                            ) : (
                              <div>Client: {booking.client?.full_name}</div>
                            )}
                            {booking.description && (
                              <div className="mt-2 text-gray-700">{booking.description}</div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end space-y-2">
                          <div className="text-lg font-semibold text-gray-900">
                            KSH {booking.total_amount}
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            {user?.profile?.role === 'fundi' && booking.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => updateBookingStatus(booking.id, 'accepted')}
                                  className="flex items-center px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Accept
                                </button>
                                <button
                                  onClick={() => updateBookingStatus(booking.id, 'rejected')}
                                  className="flex items-center px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Reject
                                </button>
                              </>
                            )}

                            {user?.profile?.role === 'fundi' && booking.status === 'accepted' && (
                              <button
                                onClick={() => markBookingCompleted(booking.id)}
                                className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Mark Complete
                              </button>
                            )}

                            {canSubmitDispute(booking) && (
                              <button
                                onClick={() => setShowDisputeForm(booking.id)}
                                className="flex items-center px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                              >
                                <AlertTriangle className="h-4 w-4 mr-1" />
                                Dispute
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Loyalty Sidebar - Only for clients */}
          {user?.profile?.role === 'client' && loyaltySummary && (
            <div className="space-y-6">
              <LoyaltyCard 
                loyaltySummary={loyaltySummary}
                onRedeemPoints={() => setShowRedeemModal(true)}
              />
              
              <LoyaltyTransactions transactions={loyaltySummary.recent_transactions} />
            </div>
          )}
        </div>

        {/* Redeem Points Modal */}
        {user?.profile?.role === 'client' && loyaltySummary && (
          <RedeemPointsModal
            isOpen={showRedeemModal}
            onClose={() => setShowRedeemModal(false)}
            currentPoints={loyaltySummary.current_points}
            onRedemptionSuccess={() => {
              refreshLoyalty();
              setShowRedeemModal(false);
            }}
          />
        )}

        {/* Dispute Form Modal */}
        {showDisputeForm && (
          <DisputeForm
            bookingId={showDisputeForm}
            onSuccess={() => {
              setShowDisputeForm(null);
              // Could show success message or refresh disputes list
            }}
            onCancel={() => setShowDisputeForm(null)}
          />
        )}
      </div>
    </div>
  );
}