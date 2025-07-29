import React from 'react';
import { useHospitalData } from '../../../contexts/HospitalDataContext';
import { isDeviceOnline } from '../../../utils/deviceUtils';
import OverviewCards from '../components/OverviewCards';
import PatientManagement from '../components/admin/PatientManagement';
import StaffManagement from '../components/admin/StaffManagement';
import RoomManagement from '../components/admin/RoomManagement';
import DeviceManagement from '../components/admin/DeviceManagement';
import AlertsManagement from '../components/admin/AlertsManagement';
import TestSimpleAlert from '../components/admin/TestSimpleAlert';
import Analytics from '../components/admin/Analytics';
import Settings from '../components/admin/Settings';
import SmartQueryChat from '../components/SmartQuery/SmartQueryChat';

interface AdminDashboardProps {
  activeView: string;
}
const formatTimestamp = (timestamp: string | undefined | null): string => {
  if (!timestamp) return 'No data available';
  
  try {
    // Debug: log the timestamp being processed
    console.log('Formatting timestamp:', timestamp);
    
    // Handle different timestamp formats
    let date: Date;
    
    // If timestamp contains underscore (backend format: YYYY-MM-DD_HH-MM-SS)
    if (typeof timestamp === 'string' && timestamp.includes('_')) {
      const [datePart, timePart] = timestamp.split('_');
      const [year, month, day] = datePart.split('-');
      const [hour, minute, second] = timePart.split('-');
      date = new Date(
        parseInt(year), 
        parseInt(month) - 1, // Month is 0-indexed in JavaScript
        parseInt(day), 
        parseInt(hour), 
        parseInt(minute), 
        parseInt(second || '0') // Handle cases where seconds might be missing
      );
    } else {
      // Standard ISO format or other formats
      date = new Date(timestamp);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date created from timestamp:', timestamp);
      return 'Invalid date';
    }
    
    // Return formatted date with more readable format
    const result = date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    console.log('Formatted result:', result);
    return result;
  } catch (error) {
    console.error('Error formatting timestamp:', timestamp, error);
    return 'Invalid date format';
  }
};
const AdminDashboard: React.FC<AdminDashboardProps> = ({ activeView }) => {
  console.log('AdminDashboard rendered with activeView:', activeView);
  
  const { 
    patients, 
    staff, 
    iotDevices, 
    rooms,
    getCriticalPatients, 
    getActiveAlerts,
    loading,
    error,
    refreshData 
  } = useHospitalData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-lg text-red-600 mb-4">Error: {error}</div>
        <button 
          onClick={refreshData}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  // Calculate room occupancy from actual rooms data
  const roomOccupancy = Object.values(rooms).reduce((acc, room) => {
    acc.total++;
    if (room.status === 'occupied' || room.assignedPatient) {
      acc.occupied++;
    }
    return acc;
  }, { occupied: 0, total: 0 });

  const renderView = () => {
    console.log('AdminDashboard renderView called with activeView:', activeView);
    
    switch (activeView) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleString()}
              </div>
            </div>
            <OverviewCards />
            
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Patients</p>
                    <p className="text-2xl font-bold text-gray-900">{Object.keys(patients).length}</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">{Object.keys(patients).length}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-green-600 text-sm font-medium">
                    {getCriticalPatients().length} critical
                  </span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Staff on Duty</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Object.values(staff).filter(s => s.currentStatus.onDuty).length}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 font-semibold">
                      {Object.values(staff).filter(s => s.currentStatus.onDuty).length}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-gray-600 text-sm">
                    of {Object.keys(staff).length} total staff
                  </span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Devices</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Object.values(iotDevices).filter(d => isDeviceOnline(d)).length}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 font-semibold">
                      {Object.values(iotDevices).filter(d => isDeviceOnline(d)).length}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-gray-600 text-sm">
                    of {Object.keys(iotDevices).length} total devices
                  </span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Room Occupancy</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {roomOccupancy.total > 0 ? Math.round((roomOccupancy.occupied / roomOccupancy.total) * 100) : 0}%
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-orange-600 font-semibold">
                      {roomOccupancy.occupied}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-gray-600 text-sm">
                    {roomOccupancy.occupied} of {roomOccupancy.total} rooms
                  </span>
                </div>
              </div>
            </div>

            {/* Active Alerts */}
            {getActiveAlerts().length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Alerts</h3>
                <div className="space-y-3">
                  {getActiveAlerts().slice(0, 5).map((alert) => (
                    <div key={`${alert.deviceId}-${alert.alert.timestamp}`} className={`flex items-center space-x-3 p-3 rounded-lg ${
                      alert.alert.type === 'critical' ? 'bg-red-50' :
                      alert.alert.type === 'warning' ? 'bg-yellow-50' : 'bg-blue-50'
                    }`}>
                      <div className={`h-2 w-2 rounded-full ${
                        alert.alert.type === 'critical' ? 'bg-red-500' :
                        alert.alert.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}></div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          alert.alert.type === 'critical' ? 'text-red-900' :
                          alert.alert.type === 'warning' ? 'text-yellow-900' : 'text-blue-900'
                        }`}>{alert.alert.message}</p>
                        <p className={`text-xs ${
                          alert.alert.type === 'critical' ? 'text-red-600' :
                          alert.alert.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                        }`}>Device: {alert.deviceId.replace(/^m/, 'M').replace('_', ' ')}</p>
                      </div>
                      <span className={`text-xs ${
                        alert.alert.type === 'critical' ? 'text-red-600' :
                        alert.alert.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                      }`}>
                        {formatTimestamp(alert.alert.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 'patients':
        return <PatientManagement />;
      case 'staff':
        return <StaffManagement />;
      case 'rooms':
        return <RoomManagement />;
      case 'devices':
        return <DeviceManagement />;
      case 'alerts':
        console.log('🎯 AdminDashboard: Rendering AlertsManagement for activeView:', activeView);
        console.log('🎯 AdminDashboard: AlertsManagement component exists:', AlertsManagement);
        const alertsComponent = <AlertsManagement />;
        console.log('🎯 AdminDashboard: Created AlertsManagement component:', alertsComponent);
        return alertsComponent;
      case 'analytics':
        console.log('Rendering Analytics component');
        return <Analytics />;
      case 'assistant':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Smart Hospital Assistant</h1>
              <div className="text-sm text-gray-500">
                Ask me about patients, rooms, or alerts
              </div>
            </div>
            <SmartQueryChat />
          </div>
        );
      case 'settings':
        console.log('Rendering Settings component');
        return <Settings />;
      default:
        console.log('Unknown activeView:', activeView);
        return <div>View not found</div>;
    }
  };

  return (
    <div className="p-6">
      {renderView()}
    </div>
  );
};

export default AdminDashboard;