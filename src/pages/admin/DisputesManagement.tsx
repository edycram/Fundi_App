import React, { useState } from 'react';
import { Shield, AlertTriangle, Users, TrendingUp } from 'lucide-react';
import { DisputesList } from '../../components/DisputesList';
import { DisputeDetails } from '../../components/DisputeDetails';
import type { Dispute } from '../../types';

export function DisputesManagement() {
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [stats, setStats] = useState({
    total_disputes: 0,
    open_disputes: 0,
    resolved_disputes: 0,
    high_priority: 0
  });

  const handleViewDispute = (dispute: Dispute) => {
    setSelectedDispute(dispute);
  };

  const handleBackToList = () => {
    setSelectedDispute(null);
  };

  if (selectedDispute) {
    return (
      <DisputeDetails
        dispute={selectedDispute}
        onBack={handleBackToList}
        onResolved={handleBackToList}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Disputes Management</h1>
          </div>
          <p className="text-gray-600">
            Monitor and resolve disputes between clients and fundis
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Disputes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_disputes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Open Disputes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.open_disputes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-gray-900">{stats.resolved_disputes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-gray-900">{stats.high_priority}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Disputes List */}
        <DisputesList 
          isAdminView={true}
          onViewDispute={handleViewDispute}
        />
      </div>
    </div>
  );
}