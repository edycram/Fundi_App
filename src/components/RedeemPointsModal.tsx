import React, { useState } from 'react';
import { X, Gift, Percent, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RedeemPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPoints: number;
  onRedemptionSuccess: () => void;
}

interface RewardOption {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  value: string;
  icon: React.ComponentType<any>;
  color: string;
}

const REWARD_OPTIONS: RewardOption[] = [
  {
    id: 'discount_10',
    title: '10% Discount',
    description: 'Get 10% off your next booking',
    pointsCost: 100,
    value: '10% off',
    icon: Percent,
    color: 'bg-blue-100 text-blue-600'
  },
  {
    id: 'discount_20',
    title: '20% Discount',
    description: 'Get 20% off your next booking',
    pointsCost: 200,
    value: '20% off',
    icon: Percent,
    color: 'bg-green-100 text-green-600'
  },
  {
    id: 'cash_voucher_500',
    title: 'KSH 500 Voucher',
    description: 'Cash voucher for any service',
    pointsCost: 300,
    value: 'KSH 500',
    icon: DollarSign,
    color: 'bg-purple-100 text-purple-600'
  },
  {
    id: 'cash_voucher_1000',
    title: 'KSH 1000 Voucher',
    description: 'Cash voucher for any service',
    pointsCost: 500,
    value: 'KSH 1000',
    icon: DollarSign,
    color: 'bg-orange-100 text-orange-600'
  },
  {
    id: 'premium_support',
    title: 'Premium Support',
    description: 'Priority customer support for 30 days',
    pointsCost: 150,
    value: '30 days',
    icon: Gift,
    color: 'bg-pink-100 text-pink-600'
  }
];

export function RedeemPointsModal({ isOpen, onClose, currentPoints, onRedemptionSuccess }: RedeemPointsModalProps) {
  const [selectedReward, setSelectedReward] = useState<RewardOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleRedeem = async () => {
    if (!selectedReward) return;

    setLoading(true);
    setError('');

    try {
      const { data, error: redeemError } = await supabase.rpc('redeem_loyalty_points', {
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
        p_points_to_redeem: selectedReward.pointsCost,
        p_description: `Redeemed ${selectedReward.title}: ${selectedReward.description}`
      });

      if (redeemError) throw redeemError;

      if (data.success) {
        onRedemptionSuccess();
        onClose();
        // Here you would typically generate the actual reward (discount code, voucher, etc.)
        alert(`Successfully redeemed ${selectedReward.title}! Check your email for details.`);
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to redeem points');
    } finally {
      setLoading(false);
    }
  };

  const availableRewards = REWARD_OPTIONS.filter(reward => reward.pointsCost <= currentPoints);
  const unavailableRewards = REWARD_OPTIONS.filter(reward => reward.pointsCost > currentPoints);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Redeem Points</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-blue-800 font-medium">Available Points</span>
                <span className="text-2xl font-bold text-blue-600">{currentPoints.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {availableRewards.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Available Rewards</h3>
              <div className="grid gap-3">
                {availableRewards.map((reward) => {
                  const IconComponent = reward.icon;
                  const isSelected = selectedReward?.id === reward.id;
                  
                  return (
                    <button
                      key={reward.id}
                      onClick={() => setSelectedReward(reward)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${reward.color}`}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{reward.title}</h4>
                            <p className="text-sm text-gray-600">{reward.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">{reward.pointsCost} pts</div>
                          <div className="text-sm text-green-600 font-medium">{reward.value}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {unavailableRewards.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Unlock More Rewards</h3>
              <div className="grid gap-3">
                {unavailableRewards.map((reward) => {
                  const IconComponent = reward.icon;
                  const pointsNeeded = reward.pointsCost - currentPoints;
                  
                  return (
                    <div
                      key={reward.id}
                      className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50 opacity-60"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${reward.color}`}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{reward.title}</h4>
                            <p className="text-sm text-gray-600">{reward.description}</p>
                            <p className="text-xs text-red-600 mt-1">
                              Need {pointsNeeded} more points
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">{reward.pointsCost} pts</div>
                          <div className="text-sm text-green-600 font-medium">{reward.value}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {availableRewards.length === 0 && (
            <div className="text-center py-8">
              <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No rewards available</h3>
              <p className="text-gray-600">
                Complete more bookings to earn points and unlock rewards!
              </p>
            </div>
          )}
        </div>

        {selectedReward && (
          <div className="border-t p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-gray-900">Selected: {selectedReward.title}</h4>
                <p className="text-sm text-gray-600">Cost: {selectedReward.pointsCost} points</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Remaining after redemption:</p>
                <p className="text-lg font-semibold text-gray-900">
                  {(currentPoints - selectedReward.pointsCost).toLocaleString()} points
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRedeem}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Redeeming...' : 'Redeem Now'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}