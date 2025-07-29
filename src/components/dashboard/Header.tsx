import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useHospitalData } from '../../contexts/HospitalDataContext';
import { Bell, LogOut, User, AlertTriangle, RefreshCw } from 'lucide-react';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { getActiveAlerts, refreshAlertsOnly } = useHospitalData();
  const activeAlerts = getActiveAlerts();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Remove auto-refresh from Header since context handles it
  // Auto-refresh is now handled by HospitalDataContext with reduced frequency

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAlertsOnly(); // Only refresh alerts instead of all data
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              Smart Hospital Dashboard
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Alerts */}
            <div className="relative">
              <button 
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="p-2 text-gray-400 hover:text-gray-500 relative transition-colors duration-200"
                title={`${activeAlerts.length} active alerts - Click to refresh`}
              >
                {isRefreshing ? (
                  <RefreshCw className="h-6 w-6 animate-spin" />
                ) : (
                  <Bell className="h-6 w-6" />
                )}
                {activeAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                    {activeAlerts.length}
                  </span>
                )}
              </button>
              
       
            </div>

            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
                </div>
              </div>

              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-gray-500 transition-colors duration-200"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Alerts Bar */}
      {activeAlerts.length > 0 && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">
                {activeAlerts.length} active alert{activeAlerts.length !== 1 ? 's' : ''}
              </span>
              <span className="text-red-600">requiring attention</span>
              {/* Show critical alerts count */}
              {activeAlerts.filter(alert => alert.alert.type === 'critical').length > 0 && (
                <span className="ml-2 px-2 py-1 bg-red-600 text-white text-xs rounded-full">
                  {activeAlerts.filter(alert => alert.alert.type === 'critical').length} Critical
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2 text-xs text-red-600">
              <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="p-1 hover:bg-red-100 rounded"
                title="Refresh alerts"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;