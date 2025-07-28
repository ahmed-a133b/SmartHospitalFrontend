import React, { useState, useEffect, useMemo } from 'react';
import { useHospitalData } from '../../../../contexts/HospitalDataContext';
import { Activity, Heart, Thermometer, Droplets, Battery, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useRealTimeVitals } from '../../../../api/hooks/useRealTimeVitals';
import { getLatestVitals, getPatientLatestVitals, isVitalReading } from '../../../../utils/deviceUtils';
import { VitalReading } from '../../../../api/types';

const formatTimestamp = (timestamp: string | undefined | null): string => {
  if (!timestamp) {
    console.log('Timestamp is null/undefined, using current time');
    return new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }
  
  try {
    let date: Date;
    
    // Handle different timestamp formats
    if (typeof timestamp === 'string' && timestamp.includes('_')) {
      // Backend format: YYYY-MM-DD_HH-MM-SS
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
      // ISO format or other standard formats
      date = new Date(timestamp);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date, using current time instead');
      date = new Date();
    }
    
    // Return simplified format for better display
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
  } catch (error) {
    console.error('Error formatting timestamp, using current time:', error);
    return new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }
};

const RealTimeMonitoring: React.FC = () => {
  const { patients, iotDevices } = useHospitalData();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Convert Record objects to arrays
  const patientsArray = Object.entries(patients);
  const iotDevicesArray = Object.values(iotDevices);

  // Get device IDs for real-time monitoring
  const deviceIds = useMemo(() => {
    return Object.keys(iotDevices);
  }, [iotDevices]);

  // Use real-time vitals hook to fetch live data every 3 seconds
  const {
    vitals: realTimeVitals,
    lastUpdated,
    loading: vitalsLoading,
    error: vitalsError,
    refreshVitals
  } = useRealTimeVitals(deviceIds, 3000);  // Filter patients that have monitoring devices with live or stored vitals
  const monitoredPatients = patientsArray.filter(([patientId, _patient]) => 
    iotDevicesArray.some(device => {
      // Check if device has current patient assigned (new structure)
      if (device.deviceInfo?.currentPatientId === patientId) {
        return true;
      }
      
      // Fallback: check vitals for patient ID (old structure compatibility)
      const latestVitals = getLatestVitals(device);
      return latestVitals && 'patientId' in latestVitals && latestVitals.patientId === patientId && latestVitals.deviceStatus === 'online';
    })
  );

  const getPatientDevice = (patientId: string) => {
    return iotDevicesArray.find(device => {
      // Check if device has current patient assigned (new structure)
      if (device.deviceInfo?.currentPatientId === patientId) {
        return true;
      }
      
      // Fallback: check vitals for patient ID (old structure compatibility)
      const latestVitals = getLatestVitals(device);
      return latestVitals && 'patientId' in latestVitals && latestVitals.patientId === patientId;
    });
  };

  const getPatientVitals = (patientId: string) => {
    // Find device assigned to this patient using the new structure
    const device = iotDevicesArray.find(device => {
      // Check if device has current patient assigned (new structure)
      if (device.deviceInfo?.currentPatientId === patientId) {
        return true;
      }
      
      // Fallback: check vitals for patient ID (old structure compatibility)
      const latestVitals = getLatestVitals(device);
      return latestVitals && 'patientId' in latestVitals && latestVitals.patientId === patientId;
    });
    
    if (device) {
      const deviceId = Object.keys(iotDevices).find(id => iotDevices[id] === device);
      const liveVitals = deviceId ? realTimeVitals[deviceId] : null;
      
      // Prefer live vitals over stored vitals (check if it's a vital reading)
      if (liveVitals && typeof liveVitals === 'object' && 'heartRate' in liveVitals) {
        return liveVitals as VitalReading;
      }
      
      // Try to get patient-specific vitals first (new structure)
      if (device.vitals && device.vitals[patientId]) {
        const patientVitals = getPatientLatestVitals(device, patientId);
        if (patientVitals) {
          return patientVitals;
        }
      }
      
      // Fallback to latest vitals (old structure)
      const vitals = getLatestVitals(device);
      return vitals && isVitalReading(vitals) ? vitals : null;
    }
    
    return null;
  };

  const getDeviceId = (device: any) => {
    return Object.keys(iotDevices).find(id => iotDevices[id] === device) || 'unknown';
  };



  const getVitalStatus = (vital: number, type: string) => {
    switch (type) {
      case 'heartRate':
        if (vital < 60) return { status: 'low', color: 'text-blue-600' };
        if (vital > 100) return { status: 'high', color: 'text-red-600' };
        return { status: 'normal', color: 'text-green-600' };
      case 'oxygenLevel':
        if (vital < 95) return { status: 'low', color: 'text-red-600' };
        if (vital < 98) return { status: 'warning', color: 'text-yellow-600' };
        return { status: 'normal', color: 'text-green-600' };
      case 'temperature':
        if (vital < 97 || vital > 99.5) return { status: 'abnormal', color: 'text-red-600' };
        return { status: 'normal', color: 'text-green-600' };
      default:
        return { status: 'unknown', color: 'text-gray-600' };
    }
  };

  const getBPStatus = (systolic: number, diastolic: number) => {
    if (systolic > 140 || diastolic > 90) return { status: 'high', color: 'text-red-600' };
    if (systolic < 90 || diastolic < 60) return { status: 'low', color: 'text-blue-600' };
    return { status: 'normal', color: 'text-green-600' };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Real-Time Patient Monitoring</h1>
        <div className="text-right flex items-center space-x-4">
          <button
            onClick={refreshVitals}
            disabled={vitalsLoading}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${vitalsLoading ? 'animate-spin' : ''}`} />
            <span>{vitalsLoading ? 'Updating...' : 'Refresh'}</span>
          </button>
          <div>
            <p className="text-sm text-gray-500">Live Feed</p>
            <p className="text-lg font-semibold text-gray-900">{currentTime.toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      {vitalsError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
              <p className="text-sm text-red-700 mt-1">{vitalsError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Monitoring Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Monitored Patients</h3>
          <p className="text-2xl font-bold text-blue-600">{monitoredPatients.length}</p>
          <p className="text-xs text-gray-500 mt-1">Currently active</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Live Devices</h3>
          <p className="text-2xl font-bold text-green-600">
            {Object.keys(realTimeVitals).length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Real-time data</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Normal Vitals</h3>
          <p className="text-2xl font-bold text-green-600">
            {monitoredPatients.filter(([patientId, _patient]) => {
              const vitals = getPatientVitals(patientId);
              if (!vitals) return false;
              
              const hr = getVitalStatus(vitals.heartRate, 'heartRate');
              const o2 = getVitalStatus(vitals.oxygenLevel, 'oxygenLevel');
              const temp = getVitalStatus(vitals.temperature, 'temperature');
              return hr.status === 'normal' && o2.status === 'normal' && temp.status === 'normal';
            }).length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Within normal range</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Alerts</h3>
          <p className="text-2xl font-bold text-red-600">
            {monitoredPatients.length - monitoredPatients.filter(([patientId, _patient]) => {
              const vitals = getPatientVitals(patientId);
              if (!vitals) return false;
              
              const hr = getVitalStatus(vitals.heartRate, 'heartRate');
              const o2 = getVitalStatus(vitals.oxygenLevel, 'oxygenLevel');
              const temp = getVitalStatus(vitals.temperature, 'temperature');
              return hr.status === 'normal' && o2.status === 'normal' && temp.status === 'normal';
            }).length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Abnormal readings</p>
        </div>
      </div>

      {/* Live Patient Monitoring */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {monitoredPatients.map(([patientId, patient]) => {
          const device = getPatientDevice(patientId);
          if (!device) return null;

          const vitals = getPatientVitals(patientId);
          if (!vitals) return null;

          const deviceId = getDeviceId(device);
          const isLiveData = Boolean(realTimeVitals[deviceId]);

          const hrStatus = getVitalStatus(vitals.heartRate, 'heartRate');
          const o2Status = getVitalStatus(vitals.oxygenLevel, 'oxygenLevel');
          const tempStatus = getVitalStatus(vitals.temperature, 'temperature');
          const bpStatus = getBPStatus(vitals.bloodPressure.systolic, vitals.bloodPressure.diastolic);

          return (
            <div key={patientId} className={`bg-white rounded-lg shadow-sm border overflow-hidden ${
              isLiveData ? 'border-green-200 ring-2 ring-green-100' : 'border-gray-200'
            }`}>
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{patient.personalInfo.name}</h3>
                    <p className="text-sm text-gray-600">{patient.currentStatus.diagnosis}</p>
                    <p className="text-sm text-gray-500">
                      {patient.personalInfo.roomId ? 
                        `Room ${patient.personalInfo.roomId.split('_')[1] || patient.personalInfo.roomId}` : 
                        'No room assigned'
                      }
                      {patient.personalInfo.bedId && (
                        ` • Bed ${patient.personalInfo.bedId.split('_')[1] || patient.personalInfo.bedId}`
                      )}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isLiveData ? (
                      <>
                        <Wifi className="h-4 w-4 text-green-600" />
                        <span className="text-xs text-green-600 font-medium">LIVE</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-4 w-4 text-gray-400" />
                        <span className="text-xs text-gray-500">STORED</span>
                      </>
                    )}
                    <Battery className={`h-4 w-4 ${vitals.batteryLevel > 20 ? 'text-green-600' : 'text-red-600'}`} />
                    <span className="text-xs text-gray-500">{vitals.batteryLevel}%</span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  {/* Heart Rate */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Heart className="h-5 w-5 text-red-500" />
                      <span className="text-sm font-medium text-gray-700">Heart Rate</span>
                    </div>
                    <p className={`text-2xl font-bold ${hrStatus.color}`}>
                      {vitals.heartRate.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-500">bpm</p>
                  </div>

                  {/* Oxygen Level */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Droplets className="h-5 w-5 text-blue-500" />
                      <span className="text-sm font-medium text-gray-700">Oxygen</span>
                    </div>
                    <p className={`text-2xl font-bold ${o2Status.color}`}>
                      {vitals.oxygenLevel.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-500">%</p>
                  </div>

                  {/* Temperature */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Thermometer className="h-5 w-5 text-orange-500" />
                      <span className="text-sm font-medium text-gray-700">Temperature</span>
                    </div>
                    <p className={`text-2xl font-bold ${tempStatus.color}`}>
                      {vitals.temperature.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-500">°F</p>
                  </div>

                  {/* Blood Pressure */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Activity className="h-5 w-5 text-purple-500" />
                      <span className="text-sm font-medium text-gray-700">Blood Pressure</span>
                    </div>
                    <p className={`text-xl font-bold ${bpStatus.color}`}>
                      {vitals.bloodPressure.systolic.toFixed(1)}/{vitals.bloodPressure.diastolic.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-500">mmHg</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Last Update:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-900">
                        {formatTimestamp(vitals?.timestamp || lastUpdated[deviceId])}
                      </span>
                      {isLiveData && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Live
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-gray-600">Device:</span>
                    <span className="text-gray-900">{deviceId.replace('_',' ').replace(/^m/, 'M')}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {monitoredPatients.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Patients Currently Monitored</h3>
          <p className="text-gray-600">Connect monitoring devices to patients to view real-time vitals.</p>
        </div>
      )}
    </div>
  );
};

export default RealTimeMonitoring;