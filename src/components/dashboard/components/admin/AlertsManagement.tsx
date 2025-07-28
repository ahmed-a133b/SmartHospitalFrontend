import React, { useState, useCallback, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, Filter, User, RefreshCw } from 'lucide-react';
import { IoTDevice } from '../../../../api/types';
import { useAuth } from '../../../../contexts/AuthContext';
import { API_BASE_URL } from '../../../../api/config';

interface AlertWithDevice {
  id: string;
  deviceId: string;
  roomId: string;
  deviceType: IoTDevice['deviceInfo']['type'];
  type: 'critical' | 'warning' | 'info'; // Changed from severity to type to match backend
  message: string;
  timestamp: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  assignedTo?: string;
}

const formatTimestamp = (timestamp: string | undefined | null): string => {
  if (!timestamp) return 'No data available';
  
  try {
    let date: Date;
    
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
    
    const result = date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    return result;
  } catch (error) {
    console.error('Error formatting timestamp:', timestamp, error);
    return 'Invalid date format';
  }
};

// Helper function to format device ID
const formatDeviceId = (deviceId: string): string => {
  return deviceId
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
};

// Helper function to format room ID
const formatRoomId = (roomId: string): string => {
  if (!roomId || roomId === 'Unknown') return roomId;
  return roomId
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
};

// Helper function to format any ID
const formatId = (id: string): string => {
  if (!id) return id;
  return id
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
};

const AlertsManagement: React.FC = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertWithDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'unresolved'>('all');
  const [error, setError] = useState<string | null>(null);

  console.log('🚨 AlertsManagement: Component is rendering!');

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🚨 AlertsManagement: Fetching alerts from API...');
      
      const response = await fetch(`${API_BASE_URL}/iotData/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🚨 AlertsManagement: Received data:', data);
      
      if (!data || typeof data !== 'object') {
        console.warn('🚨 AlertsManagement: No devices data in response');
        setAlerts([]);
        return;
      }

      // Transform device alerts into AlertWithDevice format
      const transformedAlerts: AlertWithDevice[] = [];
      
      // data is an object with device IDs as keys
      Object.entries(data).forEach(([deviceId, deviceData]: [string, any]) => {
        if (deviceData && deviceData.alerts && typeof deviceData.alerts === 'object') {
          // alerts is an object with alert IDs as keys
          Object.entries(deviceData.alerts).forEach(([alertId, alertData]: [string, any]) => {
            const deviceInfo = deviceData.deviceInfo || {};
            transformedAlerts.push({
              id: `${deviceId}_${alertId}`,
              deviceId: deviceId,
              roomId: deviceInfo.roomId || deviceInfo.location?.room || 'Unknown',
              deviceType: deviceInfo.type || 'Unknown',
              type: alertData.type as 'critical' | 'warning' | 'info', // Use 'type' instead of 'severity'
              message: alertData.message || 'No message',
              timestamp: alertData.timestamp || '',
              resolved: alertData.resolved || false,
              resolvedBy: alertData.resolvedBy,
              resolvedAt: alertData.resolvedAt,
              assignedTo: alertData.assignedTo || user?.name
            });
          });
        }
      });

      console.log('🚨 AlertsManagement: Transformed alerts:', transformedAlerts);
      setAlerts(transformedAlerts);
      
    } catch (error) {
      console.error('🚨 AlertsManagement: Error fetching alerts:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const filteredAlerts = alerts
    .filter(alert => {
      switch (filter) {
        case 'critical':
          return alert.type === 'critical';
        case 'warning':
          return alert.type === 'warning';
        case 'unresolved':
          return !alert.resolved;
        default:
          return true;
      }
    })
    .sort((a, b) => {
      // Sort by timestamp in descending order (newest first)
      const timestampA = a.timestamp;
      const timestampB = b.timestamp;
      
      if (!timestampA || !timestampB) return 0;
      
      try {
        let dateA: Date, dateB: Date;
        
        // Handle custom timestamp format (YYYY-MM-DD_HH-MM-SS)
        if (typeof timestampA === 'string' && timestampA.includes('_')) {
          const [datePart, timePart] = timestampA.split('_');
          const [year, month, day] = datePart.split('-');
          const [hour, minute, second] = timePart.split('-');
          dateA = new Date(
            parseInt(year), 
            parseInt(month) - 1, 
            parseInt(day), 
            parseInt(hour), 
            parseInt(minute), 
            parseInt(second || '0')
          );
        } else {
          dateA = new Date(timestampA);
        }
        
        if (typeof timestampB === 'string' && timestampB.includes('_')) {
          const [datePart, timePart] = timestampB.split('_');
          const [year, month, day] = datePart.split('-');
          const [hour, minute, second] = timePart.split('-');
          dateB = new Date(
            parseInt(year), 
            parseInt(month) - 1, 
            parseInt(day), 
            parseInt(hour), 
            parseInt(minute), 
            parseInt(second || '0')
          );
        } else {
          dateB = new Date(timestampB);
        }
        
        // Return descending order (newest first)
        return dateB.getTime() - dateA.getTime();
      } catch (error) {
        console.error('Error sorting alerts by timestamp:', error);
        return 0;
      }
    });

  const resolveAlert = async (alertId: string) => {
    try {
      // Parse the combined ID: format is "deviceId_alertId"
      // Alert IDs are timestamps in format YYYY-MM-DD_HH-MM-SS
      // Find the timestamp pattern to split correctly
      const timestampRegex = /(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})$/;
      const match = alertId.match(timestampRegex);
      
      if (!match) {
        throw new Error('Invalid alert ID format - timestamp not found');
      }
      
      const backendAlertId = match[1];
      const deviceId = alertId.substring(0, alertId.length - backendAlertId.length - 1); // -1 for the underscore
      
      console.log('🔄 Resolving alert:', { alertId, deviceId, backendAlertId });
      
      const response = await fetch(`${API_BASE_URL}/iotData/${deviceId}/alerts/${encodeURIComponent(backendAlertId)}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resolvedBy: user?.name,
          resolvedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to resolve alert: ${response.status} - ${errorText}`);
      }

      // Update local state
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, resolved: true, resolvedBy: user?.name, resolvedAt: new Date().toISOString() }
          : alert
      ));

      console.log('✅ Alert resolved successfully:', alertId);
    } catch (error) {
      console.error('❌ Error resolving alert:', error);
      setError(error instanceof Error ? error.message : 'Failed to resolve alert');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-lg">Loading alerts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-800">Error: {error}</span>
        </div>
        <button 
          onClick={fetchAlerts}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">System Alerts</h1>
        <button
          onClick={fetchAlerts}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Filter Controls */}
      <div className="flex space-x-2">
        {['all', 'critical', 'warning', 'unresolved'].map((filterType) => (
          <button
            key={filterType}
            onClick={() => setFilter(filterType as typeof filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === filterType
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Critical Alerts</p>
              <p className="text-2xl font-bold text-red-600">
                {alerts.filter(a => a.type === 'critical' && !a.resolved).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Warning Alerts</p>
              <p className="text-2xl font-bold text-yellow-600">
                {alerts.filter(a => a.type === 'warning' && !a.resolved).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-green-600">
                {alerts.filter(a => a.resolved).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Active Alerts ({filteredAlerts.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredAlerts.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No alerts found for the selected filter.
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div key={alert.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${
                        alert.type === 'critical' 
                          ? 'bg-red-100 text-red-600' 
                          : alert.type === 'warning'
                          ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}>
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                        <p className="text-xs text-gray-500">
                          Device: {formatDeviceId(alert.deviceId)} | Room: {formatRoomId(alert.roomId)} | Type: {formatId(alert.deviceType)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                      <span>{formatTimestamp(alert.timestamp)}</span>
                      {alert.resolved && (
                        <span className="text-green-600">
                          Resolved by {alert.resolvedBy} at {formatTimestamp(alert.resolvedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  {!alert.resolved && (
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="ml-4 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertsManagement;
