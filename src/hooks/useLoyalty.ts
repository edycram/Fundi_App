import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { LoyaltySummary } from '../types';

export function useLoyalty() {
  const { user } = useAuth();
  const [loyaltySummary, setLoyaltySummary] = useState<LoyaltySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLoyaltySummary = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      const { data, error: loyaltyError } = await supabase.rpc('get_loyalty_summary', {
        p_user_id: user.id
      });

      if (loyaltyError) throw loyaltyError;

      setLoyaltySummary(data);
    } catch (err: any) {
      console.error('Error fetching loyalty summary:', err);
      setError(err.message || 'Failed to load loyalty data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoyaltySummary();
  }, [user]);

  const refreshLoyalty = () => {
    setLoading(true);
    fetchLoyaltySummary();
  };

  return {
    loyaltySummary,
    loading,
    error,
    refreshLoyalty
  };
}