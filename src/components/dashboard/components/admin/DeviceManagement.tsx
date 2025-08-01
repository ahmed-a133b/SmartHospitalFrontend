import React, { useState, useEffect } from 'react';
import { useHospitalData } from '../../../../contexts/HospitalDataContext';
import { Plus, Search, Edit, Wifi, WifiOff, Battery, AlertTriangle, Thermometer, Droplets, Wind, User, UserCheck, UserX, InfoIcon, Volume2, CloudRain, Sun } from 'lucide-react';
import { getLatestVitals, isVitalReading, isEnvironmentalReading } from '../../../../utils/deviceUtils';
import { assignPatientToMonitor, unassignPatientFromMonitor, getAvailablePatientsForMonitor } from '../../../../api/patientMonitorAssignment';
import { API_BASE_URL } from '../../../../api/config';
import DeviceForm from './DeviceForm';


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

// Utility function to format IDs (remove underscores, capitalize first letter)
const formatId = (id: string): string => {
  if (!id) return '';
  return id
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Function to get patient name from patient ID
const getPatientName = (patientId: string, patients: Record<string, any>): string => {
  if (!patientId) {
    return 'No Patient';
  }
  
  if (!patients || Object.keys(patients).length === 0) {
    return formatId(patientId);
  }
  
  const patient = patients[patientId];
  if (!patient) {
    return formatId(patientId);
  }
  
  // Try different possible structures for patient name
  const name = patient.personalInfo?.name || 
               patient.name || 
               patient.personalInfo?.Name ||
               patient.Name;
               
  return name || formatId(patientId);
};

const DeviceManagement: React.FC = () => {
  const { iotDevices, patients, loading, error, refreshData } = useHospitalData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [assigningPatient, setAssigningPatient] = useState<string | null>(null);
  const [availablePatients, setAvailablePatients] = useState<any[]>([]);
  const [showPatientAssignment, setShowPatientAssignment] = useState<string | null>(null);
  const [envSensorVitals, setEnvSensorVitals] = useState<Record<string, any>>({});
  const [vitalMonitorVitals, setVitalMonitorVitals] = useState<Record<string, any>>({});

  // Function to fetch vital monitor vitals directly from API
  const fetchVitalMonitorVitals = async (monitorId: string) => {
    try {
      console.log(`Fetching vital monitor vitals for monitor: ${monitorId}`);
      const response = await fetch(`${API_BASE_URL}/iotData/${monitorId}/vitals/latest`);
      console.log(`Response status for ${monitorId}:`, response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Vital monitor vitals data for ${monitorId}:`, data);
        
        // Extract the actual readings from the nested structure
        if (data.data) {
          // The backend returns {timestamp, data, patientId}
          const vitals = {
            ...data.data,
            deviceStatus: data.data.deviceStatus || 'online', // Default to online if not specified
            batteryLevel: data.data.batteryLevel,
            signalStrength: data.data.signalStrength,
            timestamp: data.timestamp,
            patientId: data.patientId
          };
          console.log(`Processed vital monitor vitals for ${monitorId}:`, vitals);
          return vitals;
        } else {
          // Fallback to the original data structure
          return data || null;
        }
      } else {
        console.warn(`Failed to fetch vitals for ${monitorId}:`, response.status, response.statusText);
      }
      return null;
    } catch (error) {
      console.error(`Error fetching vital monitor vitals for ${monitorId}:`, error);
      return null;
    }
  };

  // Function to fetch environmental sensor vitals directly from API
  const fetchEnvironmentalSensorVitals = async (sensorId: string) => {
    try {
      console.log(`Fetching environmental vitals for sensor: ${sensorId}`);
      const response = await fetch(`${API_BASE_URL}/iotData/env-sensors/${sensorId}/vitals/latest`);
      console.log(`Response status for ${sensorId}:`, response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Environmental vitals data for ${sensorId}:`, data);
        
        // Extract the actual readings from the nested structure
        if (data.readings) {
          // Merge the top-level info with the readings
          const vitals = {
            ...data.readings,
            deviceStatus: data.deviceStatus || data.readings.deviceStatus,
            batteryLevel: data.batteryLevel || data.readings.batteryLevel,
            signalStrength: data.signalStrength || data.readings.signalStrength,
            timestamp: data.timestamp || data.readings.timestamp
          };
          console.log(`Processed environmental vitals for ${sensorId}:`, vitals);
          return vitals;
        } else {
          // Fallback to the original data structure
          return data.data || data || null;
        }
      } else {
        console.warn(`Failed to fetch vitals for ${sensorId}:`, response.status, response.statusText);
      }
      return null;
    } catch (error) {
      console.error(`Error fetching environmental vitals for ${sensorId}:`, error);
      return null;
    }
  };

  // Function to fetch all environmental sensor vitals
  const fetchAllEnvironmentalVitals = async () => {
    try {
      const envSensors = Object.entries(iotDevices).filter(([_, device]) => 
        device.deviceInfo?.type === 'environmental_sensor'
      );

      const vitalsPromises = envSensors.map(async ([sensorId, _]) => {
        const vitals = await fetchEnvironmentalSensorVitals(sensorId);
        return { sensorId, vitals };
      });

      const results = await Promise.all(vitalsPromises);
      const vitalsMap = results.reduce((acc, { sensorId, vitals }) => {
        if (vitals) {
          acc[sensorId] = vitals;
        }
        return acc;
      }, {} as Record<string, any>);

      setEnvSensorVitals(vitalsMap);
    } catch (error) {
      console.error('Error fetching environmental sensor vitals:', error);
    }
  };

  // Function to fetch all vital monitor vitals
  const fetchAllVitalMonitorVitals = async () => {
    try {
      const vitalMonitors = Object.entries(iotDevices).filter(([_, device]) => 
        device.deviceInfo?.type === 'vitals_monitor'
      );

      const vitalsPromises = vitalMonitors.map(async ([monitorId, _]) => {
        const vitals = await fetchVitalMonitorVitals(monitorId);
        return { monitorId, vitals };
      });

      const results = await Promise.all(vitalsPromises);
      const vitalsMap = results.reduce((acc, { monitorId, vitals }) => {
        if (vitals) {
          acc[monitorId] = vitals;
        }
        return acc;
      }, {} as Record<string, any>);

      setVitalMonitorVitals(vitalsMap);
    } catch (error) {
      console.error('Error fetching vital monitor vitals:', error);
    }
  };

  // Fetch environmental vitals when component mounts or devices change
  useEffect(() => {
    if (Object.keys(iotDevices).length > 0) {
      fetchAllEnvironmentalVitals();
      fetchAllVitalMonitorVitals();
    }
  }, [iotDevices]);

  // Function to get latest vitals with environmental sensor priority
  const getDeviceLatestVitals = (device: any, deviceId: string) => {
    console.log(`Getting vitals for device ${deviceId}, type: ${device.deviceInfo?.type}`);
    
    // For environmental sensors, use directly fetched vitals
    if (device.deviceInfo?.type === 'environmental_sensor' && envSensorVitals[deviceId]) {
      console.log(`Using fetched environmental vitals for ${deviceId}:`, envSensorVitals[deviceId]);
      return envSensorVitals[deviceId];
    }
    
    // For vital monitors, use directly fetched vitals
    if (device.deviceInfo?.type === 'vitals_monitor' && vitalMonitorVitals[deviceId]) {
      console.log(`Using fetched vital monitor vitals for ${deviceId}:`, vitalMonitorVitals[deviceId]);
      return vitalMonitorVitals[deviceId];
    }
    
    // For other devices, use the utility function
    const vitals = getLatestVitals(device);
    console.log(`Using utility function vitals for ${deviceId}:`, vitals);
    return vitals;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-600">Loading device data...</div>
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

  // Calculate device stats
  const deviceStats = Object.entries(iotDevices).reduce((acc, [deviceId, device]) => {
    const latestVitals = getDeviceLatestVitals(device, deviceId);
    if (latestVitals && latestVitals.deviceStatus) {
      const status = latestVitals.deviceStatus as 'online' | 'offline' | 'maintenance';
      acc[status] = (acc[status] || 0) + 1;
    } else {
      acc.offline = (acc.offline || 0) + 1;
    }
    return acc;
  }, { online: 0, offline: 0, maintenance: 0 } as Record<'online' | 'offline' | 'maintenance', number>);

  const filteredDevices = Object.entries(iotDevices).filter(([id, device]) =>
    id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (device.deviceInfo?.type && device.deviceInfo.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (device.deviceInfo?.roomId && device.deviceInfo.roomId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusColor = (status: 'online' | 'offline' | 'maintenance') => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800';
      case 'offline': return 'bg-red-100 text-red-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-green-600';
    if (level > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Patient assignment functions
  const validateMonitorPatientAssignment = async (deviceId: string, patientId: string): Promise<{ valid: boolean; error?: string }> => {
    try {
      // Get patient information
      const patient = patients[patientId];
      if (!patient) {
        return { valid: false, error: 'Patient not found' };
      }

      // Get monitor device information
      const monitor = iotDevices[deviceId];
      if (!monitor) {
        return { valid: false, error: 'Monitor device not found' };
      }

      // Check if monitor is assigned to a room
      if (!monitor.deviceInfo?.roomId) {
        return { valid: false, error: 'Monitor is not assigned to any room' };
      }

      // Check if monitor is assigned to a specific bed
      if (!monitor.deviceInfo?.bedId) {
        return { valid: false, error: 'Monitor is not assigned to any bed' };
      }

      // Get patient's room and bed information
      const patientRoomId = patient.personalInfo?.roomId;
      const patientBedId = patient.personalInfo?.bedId;

      if (!patientRoomId || !patientBedId) {
        return { valid: false, error: 'Patient is not assigned to a room or bed' };
      }

      // Check if monitor and patient are in the same room
      if (monitor.deviceInfo.roomId !== patientRoomId) {
        return { 
          valid: false, 
          error: `Monitor is in ${formatId(monitor.deviceInfo.roomId)} but patient is in ${formatId(patientRoomId)}` 
        };
      }

      // Check if monitor and patient are assigned to the same bed
      if (monitor.deviceInfo.bedId !== patientBedId) {
        return { 
          valid: false, 
          error: `Monitor is assigned to ${formatId(monitor.deviceInfo.bedId)} but patient is in ${formatId(patientBedId)}` 
        };
      }

      return { valid: true };
    } catch (error) {
      console.error('Error validating monitor-patient assignment:', error);
      return { valid: false, error: 'Failed to validate assignment' };
    }
  };

  const handleAssignPatient = async (deviceId: string, patientId: string) => {
    setAssigningPatient(deviceId);
    try {
      // First, validate that the monitor is attached to the patient's bed
      const validation = await validateMonitorPatientAssignment(deviceId, patientId);
      if (!validation.valid) {
        alert(`Cannot assign patient: ${validation.error}`);
        return;
      }

      const result = await assignPatientToMonitor(deviceId, patientId);
      if (result.success) {
        await refreshData();
        setShowPatientAssignment(null);
      } else {
        alert(result.error || 'Failed to assign patient to monitor');
      }
    } catch (error) {
      alert('Error assigning patient to monitor');
      console.error(error);
    } finally {
      setAssigningPatient(null);
    }
  };

  const handleUnassignPatient = async (deviceId: string) => {
    setAssigningPatient(deviceId);
    try {
      const result = await unassignPatientFromMonitor(deviceId);
      if (result.success) {
        await refreshData();
      } else {
        alert(result.error || 'Failed to unassign patient from monitor');
      }
    } catch (error) {
      alert('Error unassigning patient from monitor');
      console.error(error);
    } finally {
      setAssigningPatient(null);
    }
  };

  const showPatientAssignmentModal = async (deviceId: string) => {
    try {
      const patientsData = await getAvailablePatientsForMonitor(deviceId);
      
      // Add validation status to each patient
      const patientsWithValidation = await Promise.all(
        (patientsData.availablePatients || []).map(async (patient: any) => {
          const validation = await validateMonitorPatientAssignment(deviceId, patient.patientId);
          return {
            ...patient,
            isValidForAssignment: validation.valid,
            validationError: validation.error
          };
        })
      );
      
      setAvailablePatients(patientsWithValidation);
      setShowPatientAssignment(deviceId);
    } catch (error) {
      alert('Error fetching available patients');
      console.error(error);
    }
  };

  const StatusIcon = ({ status }: { status: 'online' | 'offline' | 'maintenance' }) => {
    switch (status) {
      case 'online':
        return <Wifi className="h-4 w-4 text-green-600" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">IoT Device Management</h1>
        <div className="flex space-x-3">
          
          <button 
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus className="h-5 w-5" />
            <span>Add Device</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Search devices by ID, type, or room..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Total Devices</h3>
              <p className="text-3xl font-bold text-gray-900 mt-1">{Object.keys(iotDevices).length}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="w-6 h-6 bg-blue-500 rounded" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Online</h3>
              <p className="text-3xl font-bold text-green-600 mt-1">{deviceStats.online}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Wifi className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Offline</h3>
              <p className="text-3xl font-bold text-red-600 mt-1">{deviceStats.offline}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <WifiOff className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Maintenance</h3>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{deviceStats.maintenance}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDevices.map(([id, device]) => {
          const latestVitals = getDeviceLatestVitals(device, id);
          const activeAlerts = device.alerts ? Object.values(device.alerts).filter(alert => !alert.resolved) : [];
          const currentPatientId = device.deviceInfo?.currentPatientId;
          const isVitalsMonitor = device.deviceInfo?.type === 'vitals_monitor';
          const isEnvironmentalSensor = device.deviceInfo?.type === 'environmental_sensor';
          
          return (
            <div key={id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-gray-300">
              {/* Header Section */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-lg font-bold text-gray-900">{formatId(id)}</h3>
                      <div className="flex items-center space-x-1">
                        <StatusIcon status={latestVitals?.deviceStatus || 'offline'} />
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(latestVitals?.deviceStatus || 'offline')}`}>
                          {latestVitals?.deviceStatus || 'offline'}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {device.deviceInfo?.manufacturer || 'Unknown'} {device.deviceInfo?.model || 'Unknown'}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>
                        📍 {device.deviceInfo?.roomId 
                          ? `Room ${device.deviceInfo.roomId.split('_')[1]}` 
                          : 'No room assigned'
                        }
                        {device.deviceInfo?.bedId && ` • Bed ${device.deviceInfo.bedId.split('_')[1]}`}
                      </span>
                    </div>
                  </div>
                  
                  {/* Status Indicators */}
                  <div className="flex flex-col items-end space-y-2">
                    {isVitalsMonitor && (
                      <div className="flex items-center space-x-1">
                        {currentPatientId ? (
                          <div className="flex items-center text-green-600 text-xs bg-green-50 px-2 py-1 rounded-full border border-green-200">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Assigned
                          </div>
                        ) : (
                          <div className="flex items-center text-gray-400 text-xs bg-gray-50 px-2 py-1 rounded-full border border-gray-200">
                            <UserX className="h-3 w-3 mr-1" />
                            No Patient
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Battery Level */}
                    {latestVitals?.batteryLevel && (
                      <div className="flex items-center space-x-1 bg-white px-2 py-1 rounded-full border border-gray-200">
                        <Battery className={`h-3 w-3 ${getBatteryColor(latestVitals.batteryLevel)}`} />
                        <span className={`text-xs font-medium ${getBatteryColor(latestVitals.batteryLevel)}`}>
                          {latestVitals.batteryLevel}%
                        </span>
                      </div>
                    )}
                    
                    {/* Alert Indicator */}
                    {activeAlerts.length > 0 && (
                      <div className="flex items-center space-x-1 bg-red-50 text-red-600 px-2 py-1 rounded-full border border-red-200">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="text-xs font-medium">{activeAlerts.length}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Body Section */}
              <div className="p-4 space-y-4">
                {/* Patient Assignment for Vitals Monitors */}
                {isVitalsMonitor && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-gray-600">Patient:</span>
                    {currentPatientId ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <UserCheck className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-gray-900">
                              {getPatientName(currentPatientId, patients)}
                            </span>
                          </div>
                          <button
                            onClick={() => handleUnassignPatient(id)}
                            disabled={assigningPatient === id}
                            className="text-red-600 hover:text-red-800 text-xs px-3 py-1 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                          >
                            {assigningPatient === id ? 'Detaching...' : 'Detach'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <UserX className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">No patient assigned</span>
                          </div>
                          <button
                            onClick={() => showPatientAssignmentModal(id)}
                            disabled={assigningPatient === id}
                            className="text-blue-600 hover:text-blue-800 text-xs px-3 py-1 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                          >
                            {assigningPatient === id ? 'Assigning...' : 'Assign'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Latest Readings */}
                {latestVitals && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                        <span>📊 Latest Readings</span>
                      </h4>
                      {isEnvironmentalSensor && (
                        <button
                          onClick={() => fetchEnvironmentalSensorVitals(id).then(vitals => {
                            if (vitals) {
                              setEnvSensorVitals(prev => ({ ...prev, [id]: vitals }));
                            }
                          })}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          🔄 Refresh
                        </button>
                      )}
                      {isVitalsMonitor && (
                        <button
                          onClick={() => fetchVitalMonitorVitals(id).then(vitals => {
                            if (vitals) {
                              setVitalMonitorVitals(prev => ({ ...prev, [id]: vitals }));
                            }
                          })}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          🔄 Refresh
                        </button>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-500 mb-3">
                      Last updated: {formatTimestamp(latestVitals.timestamp)}
                    </div>

                    {/* Environmental Sensor Readings */}
                    {isEnvironmentalSensor && isEnvironmentalReading(latestVitals) ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-red-50 border border-red-100 rounded-lg p-2 flex items-center space-x-2">
                          <Thermometer className="h-4 w-4 text-red-500" />
                          <div>
                            <div className="text-xs text-red-700 font-medium">Temperature</div>
                            <div className="text-sm font-bold text-red-800">
                              {typeof latestVitals.temperature === 'number' ? latestVitals.temperature.toFixed(1) : 'N/A'}°C
                            </div>
                          </div>
                        </div>
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 flex items-center space-x-2">
                          <Droplets className="h-4 w-4 text-blue-500" />
                          <div>
                            <div className="text-xs text-blue-700 font-medium">Humidity</div>
                            <div className="text-sm font-bold text-blue-800">
                              {typeof latestVitals.humidity === 'number' ? latestVitals.humidity.toFixed(1) : 'N/A'}%
                            </div>
                          </div>
                        </div>
                        <div className="bg-green-50 border border-green-100 rounded-lg p-2 flex items-center space-x-2">
                          <Wind className="h-4 w-4 text-green-500" />
                          <div>
                            <div className="text-xs text-green-700 font-medium">Air Quality</div>
                            <div className="text-sm font-bold text-green-800">
                              {typeof latestVitals.airQuality === 'number' ? latestVitals.airQuality.toFixed(1) : 'N/A'}
                            </div>
                          </div>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-2 flex items-center space-x-2">
                          <CloudRain className="h-4 w-4 text-yellow-500" />
                          <div>
                            <div className="text-xs text-yellow-700 font-medium">CO2</div>
                            <div className="text-sm font-bold text-yellow-800">
                              {typeof latestVitals.co2Level === 'number' ? latestVitals.co2Level.toFixed(1) : 'N/A'} ppm
                            </div>
                          </div>
                        </div>
                        <div className="bg-purple-50 border border-purple-100 rounded-lg p-2 flex items-center space-x-2">
                          <Sun className="h-4 w-4 text-purple-500" />
                          <div>
                            <div className="text-xs text-purple-700 font-medium">Light</div>
                            <div className="text-sm font-bold text-purple-800">
                              {typeof latestVitals.lightLevel === 'number' ? latestVitals.lightLevel.toFixed(1) : 'N/A'} lux
                            </div>
                          </div>
                        </div>
                        <div className="bg-orange-50 border border-orange-100 rounded-lg p-2 flex items-center space-x-2">
                          <Volume2 className="h-4 w-4 text-orange-500" />
                          <div>
                            <div className="text-xs text-orange-700 font-medium">Noise</div>
                            <div className="text-sm font-bold text-orange-800">
                              {typeof latestVitals.noiseLevel === 'number' ? latestVitals.noiseLevel.toFixed(1) : 'N/A'} dB
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : isVitalReading(latestVitals) ? (
                      /* Vitals Monitor Readings */
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-red-50 border border-red-100 rounded-lg p-2">
                          <div className="text-xs text-red-700 font-medium">Heart Rate</div>
                          <div className="text-sm font-bold text-red-800">{latestVitals.heartRate} bpm</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-2">
                          <div className="text-xs text-blue-700 font-medium">Oxygen</div>
                          <div className="text-sm font-bold text-blue-800">{latestVitals.oxygenLevel.toFixed(1)}%</div>
                        </div>
                        <div className="bg-green-50 border border-green-100 rounded-lg p-2">
                          <div className="text-xs text-green-700 font-medium">Temperature</div>
                          <div className="text-sm font-bold text-green-800">{latestVitals.temperature.toFixed(1)}°C</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-100 rounded-lg p-2">
                          <div className="text-xs text-purple-700 font-medium">Blood Pressure</div>
                          <div className="text-sm font-bold text-purple-800">
                            {latestVitals.bloodPressure.systolic.toFixed(1)}/{latestVitals.bloodPressure.diastolic.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    ) : isEnvironmentalSensor ? (
                      /* Fallback Environmental Sensor Display */
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-red-50 border border-red-100 rounded-lg p-2 flex items-center space-x-2">
                          <Thermometer className="h-4 w-4 text-red-500" />
                          <div>
                            <div className="text-xs text-red-700 font-medium">Temperature</div>
                            <div className="text-sm font-bold text-red-800">
                              {typeof latestVitals.temperature === 'number' ? latestVitals.temperature.toFixed(1) : 'N/A'}°C
                            </div>
                          </div>
                        </div>
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 flex items-center space-x-2">
                          <Droplets className="h-4 w-4 text-blue-500" />
                          <div>
                            <div className="text-xs text-blue-700 font-medium">Humidity</div>
                            <div className="text-sm font-bold text-blue-800">
                              {typeof latestVitals.humidity === 'number' ? latestVitals.humidity.toFixed(1) : 'N/A'}%
                            </div>
                          </div>
                        </div>
                        <div className="bg-green-50 border border-green-100 rounded-lg p-2 flex items-center space-x-2">
                          <Wind className="h-4 w-4 text-green-500" />
                          <div>
                            <div className="text-xs text-green-700 font-medium">Air Quality</div>
                            <div className="text-sm font-bold text-green-800">
                              {typeof latestVitals.airQuality === 'number' ? latestVitals.airQuality.toFixed(1) : 'N/A'}
                            </div>
                          </div>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-2 flex items-center space-x-2">
                          <CloudRain className="h-4 w-4 text-yellow-500" />
                          <div>
                            <div className="text-xs text-yellow-700 font-medium">CO2</div>
                            <div className="text-sm font-bold text-yellow-800">
                              {typeof latestVitals.co2Level === 'number' ? latestVitals.co2Level.toFixed(1) : 'N/A'} ppm
                            </div>
                          </div>
                        </div>
                        <div className="bg-purple-50 border border-purple-100 rounded-lg p-2 flex items-center space-x-2">
                          <Sun className="h-4 w-4 text-purple-500" />
                          <div>
                            <div className="text-xs text-purple-700 font-medium">Light</div>
                            <div className="text-sm font-bold text-purple-800">
                              {typeof latestVitals.lightLevel === 'number' ? latestVitals.lightLevel.toFixed(1) : 'N/A'} lux
                            </div>
                          </div>
                        </div>
                        <div className="bg-orange-50 border border-orange-100 rounded-lg p-2 flex items-center space-x-2">
                          <Volume2 className="h-4 w-4 text-orange-500" />
                          <div>
                            <div className="text-xs text-orange-700 font-medium">Noise</div>
                            <div className="text-sm font-bold text-orange-800">
                              {typeof latestVitals.noiseLevel === 'number' ? latestVitals.noiseLevel.toFixed(1) : 'N/A'} dB
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                        <div className="text-sm text-gray-500">No readings available</div>
                      </div>
                    )}
                  </div>
                )}

              </div>
              
              {/* Footer Section */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  Last calibrated: {formatTimestamp(device.deviceInfo?.lastCalibrated)}
                </div>
                <div className="flex space-x-2">
                  {/* <button className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 bg-white border border-blue-200 rounded-md hover:bg-blue-50 transition-colors">
                    <InfoIcon className="h-4 w-4" />
                  </button>
                  <button className="text-gray-600 hover:text-gray-800 p-1 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                    <Edit className="h-4 w-4" />
                  </button> */}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Device Form */}
      {showAddForm && (
        <DeviceForm onClose={() => setShowAddForm(false)} />
      )}

      {/* Patient Assignment Modal */}
      {showPatientAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Assign Patient to Monitor
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Select a patient to assign to monitor {formatId(showPatientAssignment)}
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-start space-x-2">
                  <div className="text-blue-600 mt-0.5">ℹ️</div>
                  <div className="text-sm text-blue-800">
                    <strong>Safety Check:</strong> Patients can only be assigned to monitors that are attached to their bed.
                    Invalid assignments are disabled and marked with error details.
                  </div>
                </div>
              </div>
              
              {availablePatients.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availablePatients.map((patient) => (
                    <button
                      key={patient.patientId}
                      onClick={() => handleAssignPatient(showPatientAssignment, patient.patientId)}
                      disabled={assigningPatient === showPatientAssignment || !patient.isValidForAssignment}
                      className={`w-full text-left p-3 border rounded-lg transition-colors ${
                        patient.isValidForAssignment
                          ? 'border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                          : 'border-red-200 bg-red-50 cursor-not-allowed opacity-60'
                      } ${
                        assigningPatient === showPatientAssignment ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{patient.name}</div>
                          <div className="text-sm text-gray-600">
                            Room: {formatId(patient.roomId)} {patient.bedId && `| Bed: ${formatId(patient.bedId)}`}
                          </div>
                          {!patient.isValidForAssignment && patient.validationError && (
                            <div className="text-xs text-red-600 mt-1 font-medium">
                              ⚠️ {patient.validationError}
                            </div>
                          )}
                        </div>
                        {patient.isValidForAssignment ? (
                          <div className="text-green-600 text-xs ml-2">
                            ✓ Valid
                          </div>
                        ) : (
                          <div className="text-red-600 text-xs ml-2">
                            ✗ Invalid
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p>No available patients found</p>
                  <p className="text-xs mt-1">Patients must be in the same room/bed as the monitor</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowPatientAssignment(null)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceManagement;