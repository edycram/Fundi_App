import React from 'react';
import { Plus, Minus, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import type { LoyaltyTransaction } from '../types';

interface LoyaltyTransactionsProps {
  transactions: LoyaltyTransaction[];
}

export function LoyaltyTransactions({ transactions }: LoyaltyTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No loyalty activity yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Complete bookings to start earning points!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      
      <div className="space-y-4">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${
                transaction.type === 'earned' 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-red-100 text-red-600'
              }`}>
                {transaction.type === 'earned' ? (
                  <Plus className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
              </div>
              
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {transaction.description}
                </p>
                <p className="text-xs text-gray-500">
                  {format(new Date(transaction.created_at), 'MMM dd, yyyy • h:mm a')}
                </p>
              </div>
            </div>
            
            <div className={`text-sm font-semibold ${
              transaction.type === 'earned' 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {transaction.type === 'earned' ? '+' : '-'}{transaction.points} pts
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}