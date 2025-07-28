import { useState, useEffect, useCallback, useRef } from 'react';
import { IoTDevice } from '../api/types';
import { API_BASE_URL } from '../api/config';

interface AlertWithDevice {
  id: string;
  deviceId: string;
  roomId: string;
  deviceType: IoTDevice['deviceInfo']['type'];
  type: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  assignedTo?: string;
}

interface UseRealTimeAlertsOptions {
  pollInterval?: number; // in milliseconds
  enabled?: boolean;
  onNewAlert?: (alert: AlertWithDevice) => void;
  onAlertResolved?: (alert: AlertWithDevice) => void;
}

interface UseRealTimeAlertsReturn {
  alerts: AlertWithDevice[];
  loading: boolean;
  error: string | null;
  refreshAlerts: () => Promise<void>;
  lastUpdated: Date | null;
  isPolling: boolean;
  startPolling: () => void;
  stopPolling: () => void;
}

export const useRealTimeAlerts = (options: UseRealTimeAlertsOptions = {}): UseRealTimeAlertsReturn => {
  const {
    pollInterval = 5000, // 5 seconds default
    enabled = true,
    onNewAlert,
    onAlertResolved
  } = options;

  const [alerts, setAlerts] = useState<AlertWithDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const previousAlertsRef = useRef<AlertWithDevice[]>([]);

  const formatTimestamp = (timestamp: string | undefined | null): string => {
    if (!timestamp) return 'No data available';
    
    try {
      let date: Date;
      
      // Handle different timestamp formats
      if (typeof timestamp === 'string' && timestamp.includes('_')) {
        const [datePart, timePart] = timestamp.split('_');
        const [year, month, day] = datePart.split('-');
        const [hour, minute, second] = timePart.split('-');
        date = new Date(
          parseInt(year), 
          parseInt(month) - 1,
          parseInt(day), 
          parseInt(hour), 
          parseInt(minute), 
          parseInt(second || '0')
        );
      } else {
        date = new Date(timestamp);
      }
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid date created from timestamp:', timestamp);
        return 'Invalid date';
      }
      
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting timestamp:', timestamp, error);
      return 'Invalid date format';
    }
  };

  const fetchAlerts = useCallback(async (): Promise<AlertWithDevice[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/iotData`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch IoT data`);
      }

      const iotDevices: Record<string, IoTDevice> = await response.json();
      
      if (!iotDevices || typeof iotDevices !== 'object') {
        return [];
      }

      // Flatten alerts from all devices
      const allAlerts = Object.entries(iotDevices).flatMap(([deviceId, device]) => {
        if (!device || !device.deviceInfo) {
          return [];
        }

        const alerts = device.alerts || {};
        return Object.entries(alerts).map(([alertId, alert]) => {
          if (!alert || typeof alert !== 'object') {
            return null;
          }

          return {
            id: alertId,
            deviceId,
            roomId: device.deviceInfo.roomId || 'Unknown',
            deviceType: device.deviceInfo.type || 'unknown',
            type: alert.type || 'info',
            message: alert.message || 'No message',
            timestamp: formatTimestamp(alert.timestamp),
            resolved: Boolean(alert.resolved),
            resolvedBy: alert.resolvedBy,
            resolvedAt: alert.resolvedAt,
            assignedTo: alert.assignedTo
          } as AlertWithDevice;
        }).filter((alert): alert is AlertWithDevice => alert !== null);
      });

      // Sort alerts by priority and timestamp
      return allAlerts.sort((a, b) => {
        if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
        if (!a.resolved && a.type !== b.type) {
          if (a.type === 'critical') return -1;
          if (b.type === 'critical') return 1;
          if (a.type === 'warning') return -1;
          if (b.type === 'warning') return 1;
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      throw err;
    }
  }, []);

  const refreshAlerts = useCallback(async () => {
    if (loading) return; // Prevent concurrent requests

    setLoading(true);
    setError(null);

    try {
      const newAlerts = await fetchAlerts();
      const previousAlerts = previousAlertsRef.current;

      // Detect new alerts
      if (onNewAlert && previousAlerts.length > 0) {
        const previousAlertIds = new Set(previousAlerts.map(a => `${a.deviceId}-${a.id}`));
        
        newAlerts.forEach(alert => {
          const alertKey = `${alert.deviceId}-${alert.id}`;
          if (!previousAlertIds.has(alertKey) && !alert.resolved) {
            onNewAlert(alert);
          }
        });
      }

      // Detect resolved alerts
      if (onAlertResolved && previousAlerts.length > 0) {
        previousAlerts.forEach(prevAlert => {
          if (!prevAlert.resolved) {
            const currentAlert = newAlerts.find(a => 
              a.deviceId === prevAlert.deviceId && a.id === prevAlert.id
            );
            if (currentAlert && currentAlert.resolved) {
              onAlertResolved(currentAlert);
            }
          }
        });
      }

      setAlerts(newAlerts);
      previousAlertsRef.current = newAlerts;
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, [fetchAlerts, onNewAlert, onAlertResolved]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsPolling(true);
    intervalRef.current = setInterval(refreshAlerts, pollInterval);
  }, [refreshAlerts, pollInterval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Initial load and setup polling
  useEffect(() => {
    refreshAlerts(); // Initial load

    if (enabled) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, startPolling, stopPolling, refreshAlerts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    alerts,
    loading,
    error,
    refreshAlerts,
    lastUpdated,
    isPolling,
    startPolling,
    stopPolling
  };
};
