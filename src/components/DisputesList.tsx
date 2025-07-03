import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle, XCircle, MessageSquare, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Dispute } from '../types';

interface DisputesListProps {
  isAdminView?: boolean;
  onViewDispute?: (dispute: Dispute) => void;
}

export function DisputesList({ isAdminView = false, onViewDispute }: DisputesListProps) {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({
    status: '',
    priority: ''
  });

  useEffect(() => {
    fetchDisputes();
  }, [filter, isAdminView]);

  const fetchDisputes = async () => {
    if (!user) return;

    try {
      setError('');
      
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dispute-management/list`;
      const params = new URLSearchParams();
      
      if (isAdminView) params.append('admin', 'true');
      if (filter.status) params.append('status', filter.status);
      if (filter.priority) params.append('priority', filter.priority);

      const response = await fetch(`${apiUrl}?${params}`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch disputes');
      }

      setDisputes(result.disputes);
    } catch (err: any) {
      setError(err.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'investigating':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'resolved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'closed':
        return <XCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'investigating': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'escalated': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDisputeTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'payment_issue': 'Payment Issue',
      'service_quality': 'Service Quality',
      'no_show': 'No Show',
      'cancellation': 'Cancellation',
      'communication': 'Communication',
      'safety_concern': 'Safety Concern',
      'other': 'Other'
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filter.status}
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="escalated">Escalated</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={filter.priority}
              onChange={(e) => setFilter(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Disputes List */}
      <div className="bg-white rounded-lg shadow-sm">
        {disputes.length === 0 ? (
          <div className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No disputes found</h3>
            <p className="text-gray-600">
              {isAdminView 
                ? 'No disputes have been submitted yet.'
                : 'You have no active disputes.'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {disputes.map((dispute) => (
              <div key={dispute.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(dispute.status)}
                      <h3 className="text-lg font-medium text-gray-900">
                        {dispute.subject}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(dispute.status)}`}>
                        {dispute.status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(dispute.priority)}`}>
                        {dispute.priority}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center space-x-4">
                        <span>Type: {getDisputeTypeLabel(dispute.type)}</span>
                        <span>•</span>
                        <span>Booking ID: {dispute.booking_id.slice(-8)}</span>
                        <span>•</span>
                        <span>Created: {format(new Date(dispute.created_at), 'MMM dd, yyyy')}</span>
                      </div>
                      
                      {isAdminView && (
                        <div className="flex items-center space-x-4">
                          <span>Complainant: {dispute.complainant?.full_name}</span>
                          <span>•</span>
                          <span>Respondent: {dispute.respondent?.full_name}</span>
                        </div>
                      )}
                      
                      <p className="text-gray-700 line-clamp-2">
                        {dispute.description}
                      </p>
                    </div>

                    {dispute.resolution && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">
                          <strong>Resolution:</strong> {dispute.resolution}
                        </p>
                        {dispute.resolved_at && (
                          <p className="text-xs text-green-600 mt-1">
                            Resolved on {format(new Date(dispute.resolved_at), 'MMM dd, yyyy')}
                            {dispute.resolved_by_profile && ` by ${dispute.resolved_by_profile.full_name}`}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    {onViewDispute && (
                      <button
                        onClick={() => onViewDispute(dispute)}
                        className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                    )}
                    
                    <button className="flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Messages
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}