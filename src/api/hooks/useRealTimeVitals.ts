import { useState, useEffect, useCallback } from 'react';
import Api from '../api';
import { IoTDevice } from '../types';

interface LatestVitalsResponse {
  timestamp: string;
  data: IoTDevice['vitals'][string];
}

interface UseRealTimeVitalsResult {
  vitals: Record<string, IoTDevice['vitals'][string]>;
  lastUpdated: Record<string, string>;
  loading: boolean;
  error: string | null;
  refreshVitals: () => Promise<void>;
  getDeviceLatestVitals: (deviceId: string) => Promise<IoTDevice['vitals'][string] | null>;
}

export function useRealTimeVitals(deviceIds: string[], intervalMs: number = 5000): UseRealTimeVitalsResult {
  const [vitals, setVitals] = useState<Record<string, IoTDevice['vitals'][string]>>({});
  const [lastUpdated, setLastUpdated] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDeviceLatestVitals = useCallback(async (deviceId: string): Promise<IoTDevice['vitals'][string] | null> => {
    try {
      const response = await Api.get<LatestVitalsResponse>(`/iotData/${deviceId}/vitals/latest`);
      
      if (response.error) {
        console.warn(`Failed to fetch vitals for device ${deviceId}:`, response.error);
        return null;
      }

      return response.data?.data || null;
    } catch (err) {
      console.error(`Error fetching vitals for device ${deviceId}:`, err);
      return null;
    }
  }, []);

  const refreshVitals = useCallback(async () => {
    if (deviceIds.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch latest vitals for all devices concurrently
      const vitalPromises = deviceIds.map(async (deviceId) => {
        const deviceVitals = await getDeviceLatestVitals(deviceId);
        return { deviceId, vitals: deviceVitals };
      });

      const results = await Promise.all(vitalPromises);
      
      const newVitals: Record<string, IoTDevice['vitals'][string]> = {};
      const newLastUpdated: Record<string, string> = {};

      results.forEach(({ deviceId, vitals: deviceVitals }) => {
        if (deviceVitals) {
          newVitals[deviceId] = deviceVitals;
          newLastUpdated[deviceId] = new Date().toISOString();
        }
      });

      setVitals(prev => ({ ...prev, ...newVitals }));
      setLastUpdated(prev => ({ ...prev, ...newLastUpdated }));

    } catch (err) {
      console.error('Error refreshing vitals:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh vitals');
    } finally {
      setLoading(false);
    }
  }, [deviceIds, getDeviceLatestVitals]);

  // Set up automatic refresh interval
  useEffect(() => {
    if (deviceIds.length === 0) return;

    // Initial fetch
    refreshVitals();

    // Set up interval for continuous updates
    const interval = setInterval(refreshVitals, intervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [deviceIds, intervalMs, refreshVitals]);

  return {
    vitals,
    lastUpdated,
    loading,
    error,
    refreshVitals,
    getDeviceLatestVitals
  };
}

export default useRealTimeVitals;
