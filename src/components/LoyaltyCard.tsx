import React from 'react';
import { Star, Gift, TrendingUp, Award } from 'lucide-react';
import type { LoyaltySummary } from '../types';

interface LoyaltyCardProps {
  loyaltySummary: LoyaltySummary;
  onRedeemPoints?: () => void;
}

export function LoyaltyCard({ loyaltySummary, onRedeemPoints }: LoyaltyCardProps) {
  const { current_points, total_earned, total_redeemed } = loyaltySummary;

  const getPointsLevel = (points: number) => {
    if (points >= 1000) return { level: 'Platinum', color: 'bg-purple-600', icon: Award };
    if (points >= 500) return { level: 'Gold', color: 'bg-yellow-500', icon: Star };
    if (points >= 200) return { level: 'Silver', color: 'bg-gray-400', icon: TrendingUp };
    return { level: 'Bronze', color: 'bg-orange-600', icon: Gift };
  };

  const pointsLevel = getPointsLevel(total_earned);
  const IconComponent = pointsLevel.icon;

  const nextLevelThreshold = total_earned >= 1000 ? null : 
    total_earned >= 500 ? 1000 :
    total_earned >= 200 ? 500 : 200;

  const progressPercentage = nextLevelThreshold ? 
    ((total_earned % (nextLevelThreshold === 1000 ? 500 : nextLevelThreshold === 500 ? 300 : 200)) / 
     (nextLevelThreshold === 1000 ? 500 : nextLevelThreshold === 500 ? 300 : 200)) * 100 : 100;

  return (
    <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl p-6 text-white shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full ${pointsLevel.color}`}>
            <IconComponent className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Loyalty Points</h3>
            <p className="text-blue-100 text-sm">{pointsLevel.level} Member</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">{current_points.toLocaleString()}</div>
          <p className="text-blue-100 text-sm">Available Points</p>
        </div>
      </div>

      {nextLevelThreshold && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Progress to next level</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-blue-800 rounded-full h-2">
            <div 
              className="bg-white rounded-full h-2 transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-blue-100 mt-1">
            {nextLevelThreshold - total_earned} points to {
              nextLevelThreshold === 1000 ? 'Platinum' :
              nextLevelThreshold === 500 ? 'Gold' : 'Silver'
            }
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xl font-semibold">{total_earned.toLocaleString()}</div>
          <p className="text-blue-100 text-sm">Total Earned</p>
        </div>
        <div className="text-center">
          <div className="text-xl font-semibold">{total_redeemed.toLocaleString()}</div>
          <p className="text-blue-100 text-sm">Total Redeemed</p>
        </div>
      </div>

      {current_points >= 50 && onRedeemPoints && (
        <button
          onClick={onRedeemPoints}
          className="w-full bg-white text-blue-600 py-2 px-4 rounded-lg font-medium hover:bg-blue-50 transition-colors"
        >
          Redeem Points
        </button>
      )}

      {current_points < 50 && (
        <div className="text-center text-blue-100 text-sm">
          Complete more bookings to earn points and unlock rewards!
        </div>
      )}
    </div>
  );
}