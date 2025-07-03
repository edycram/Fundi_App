import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, User, MessageSquare, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Dispute, DisputeMessage } from '../types';

interface DisputeDetailsProps {
  dispute: Dispute;
  onBack: () => void;
  onResolved?: () => void;
}

export function DisputeDetails({ dispute, onBack, onResolved }: DisputeDetailsProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [resolution, setResolution] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  const isAdmin = user?.profile?.role === 'admin';

  useEffect(() => {
    fetchDisputeDetails();
  }, [dispute.id]);

  const fetchDisputeDetails = async () => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dispute-management/details`;
      
      const response = await fetch(`${apiUrl}?id=${dispute.id}`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      const result = await response.json();

      if (response.ok) {
        setMessages(result.messages);
      }
    } catch (error) {
      console.error('Error fetching dispute details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dispute-management/message`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          dispute_id: dispute.id,
          message: newMessage,
          is_admin_message: isAdmin
        })
      });

      if (response.ok) {
        setNewMessage('');
        fetchDisputeDetails(); // Refresh messages
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleResolveDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolution.trim()) return;

    setResolving(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dispute-management/resolve`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          dispute_id: dispute.id,
          resolution,
          status: 'resolved',
          admin_notes: adminNotes
        })
      });

      if (response.ok && onResolved) {
        onResolved();
      }
    } catch (error) {
      console.error('Error resolving dispute:', error);
    } finally {
      setResolving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'investigating': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Disputes
          </button>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                  <h1 className="text-2xl font-bold text-gray-900">{dispute.subject}</h1>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(dispute.status)}`}>
                    {dispute.status}
                  </span>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <p><strong>Type:</strong> {dispute.type.replace('_', ' ')}</p>
                    <p><strong>Priority:</strong> {dispute.priority}</p>
                    <p><strong>Created:</strong> {format(new Date(dispute.created_at), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                  <div>
                    <p><strong>Complainant:</strong> {dispute.complainant?.full_name}</p>
                    <p><strong>Respondent:</strong> {dispute.respondent?.full_name}</p>
                    <p><strong>Booking ID:</strong> {dispute.booking_id.slice(-8)}</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700">{dispute.description}</p>
                </div>

                {dispute.resolution && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <h3 className="font-medium text-green-900">Resolution</h3>
                    </div>
                    <p className="text-green-800">{dispute.resolution}</p>
                    {dispute.resolved_at && (
                      <p className="text-sm text-green-600 mt-2">
                        Resolved on {format(new Date(dispute.resolved_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Messages */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Messages
                </h2>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-3 rounded-lg ${
                          message.is_admin_message
                            ? 'bg-blue-50 border border-blue-200'
                            : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-sm">
                            {message.sender?.full_name}
                            {message.is_admin_message && (
                              <span className="ml-1 px-1 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                                Admin
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(message.created_at), 'MMM dd, HH:mm')}
                          </span>
                        </div>
                        <p className="text-gray-700">{message.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Send Message Form */}
                {dispute.status !== 'resolved' && dispute.status !== 'closed' && (
                  <form onSubmit={handleSendMessage} className="mt-4">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Send
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Admin Actions */}
          {isAdmin && dispute.status !== 'resolved' && dispute.status !== 'closed' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Actions</h3>
              
              <form onSubmit={handleResolveDispute} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Resolution *
                  </label>
                  <textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    rows={4}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe how this dispute was resolved..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Notes (Internal)
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Internal notes for admin reference..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={resolving || !resolution.trim()}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resolving ? 'Resolving...' : 'Resolve Dispute'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}