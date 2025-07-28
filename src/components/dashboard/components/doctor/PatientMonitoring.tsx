import React, { useState, useEffect, useMemo } from 'react';
import { useHospitalData } from '../../../../contexts/HospitalDataContext';
import { getLatestVitals, getPatientLatestVitals } from '../../../../utils/deviceUtils';
import { VitalReading } from '../../../../api/types';
import { Search, Heart, Activity, Thermometer, Droplets, Brain, Loader, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../../../../api/config';
import { useRealTimeVitals } from '../../../../api/hooks/useRealTimeVitals';

const PatientMonitoring: React.FC = () => {
  const { patients, iotDevices } = useHospitalData();
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingPredictions, setLoadingPredictions] = useState<Record<string, boolean>>({});
  const [predictionResults, setPredictionResults] = useState<Record<string, any>>(() => {
    // Initialize from localStorage to persist across view switches
    try {
      const saved = localStorage.getItem('patientPredictions');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Convert Record to array of entries for filtering (includes IDs)
  const patientsEntries = Object.entries(patients);
  const iotDevicesArray = Object.values(iotDevices);

  // Get device IDs for real-time monitoring
  const deviceIds = useMemo(() => {
    return Object.keys(iotDevices);
  }, [iotDevices]);

  // Use real-time vitals hook to fetch live data every 3 seconds
  const {
    vitals: realTimeVitals,
    loading: vitalsLoading,
    error: vitalsError,
    refreshVitals
  } = useRealTimeVitals(deviceIds, 3000);

  // Effect to save prediction results to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('patientPredictions', JSON.stringify(predictionResults));
    } catch (error) {
      console.warn('Failed to save predictions to localStorage:', error);
    }
  }, [predictionResults]);

  // Clean up old predictions (older than 1 hour) on component mount
  useEffect(() => {
    const cleanupOldPredictions = () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      setPredictionResults(prev => {
        const cleaned = { ...prev };
        let hasChanges = false;
        
        Object.keys(cleaned).forEach(patientId => {
          const prediction = cleaned[patientId];
          const predictionTime = prediction.lastUpdated || prediction.predictedAt || prediction.predicted_at;
          
          if (predictionTime && predictionTime < oneHourAgo) {
            delete cleaned[patientId];
            hasChanges = true;
            console.log(`Cleaned old prediction for patient ${patientId}`);
          }
        });
        
        return hasChanges ? cleaned : prev;
      });
    };
    
    cleanupOldPredictions();
  }, []);

  // Debug effect to track prediction state changes and real-time vitals
  useEffect(() => {
    console.log('PredictionResults state updated:', predictionResults);
    console.log('API_BASE_URL being used:', API_BASE_URL);
    console.log('Real-time vitals updated:', realTimeVitals);
    console.log('Vitals loading status:', vitalsLoading);
    console.log('Vitals error:', vitalsError);
    
    // Debug IoT devices and patient assignments
    console.log('=== IoT DEVICES DEBUG ===');
    iotDevicesArray.forEach((device, index) => {
      console.log(`Device ${index}:`, {
        deviceInfo: device.deviceInfo,
        hasVitals: !!device.vitals,
        vitalsKeys: device.vitals ? Object.keys(device.vitals) : [],
        vitalsStructure: device.vitals ? Object.keys(device.vitals).map(key => ({
          patientId: key,
          timestampsCount: Object.keys(device.vitals[key] || {}).length
        })) : []
      });
    });
    
    console.log('=== PATIENTS DEBUG ===');
    patientsEntries.forEach(([patientId, patient]) => {
      console.log(`Patient ${patientId}:`, {
        name: patient.personalInfo.name,
        roomId: patient.personalInfo.roomId,
        bedId: patient.personalInfo.bedId
      });
    });
  }, [predictionResults, iotDevicesArray, patientsEntries, realTimeVitals, vitalsLoading, vitalsError]);

  // Function to get patient vitals with real-time priority
  const getPatientVitals = (patientId: string) => {
    console.log(`Getting vitals for patient: ${patientId}`);
    
    // Find device assigned to this patient using the new structure
    const device = iotDevicesArray.find(device => {
      // Check if device has current patient assigned (new structure)
      if (device.deviceInfo?.currentPatientId === patientId) {
        console.log(`Found device via currentPatientId for patient ${patientId}:`, device.deviceInfo);
        return true;
      }
      
      // Fallback: check vitals for patient ID (old structure compatibility)
      const latestVitals = getLatestVitals(device);
      if (latestVitals && 'patientId' in latestVitals && latestVitals.patientId === patientId) {
        console.log(`Found device via vitals patientId for patient ${patientId}:`, latestVitals);
        return true;
      }
      
      return false;
    });
    
    if (!device) {
      console.log(`No device found for patient ${patientId}`);
      return null;
    }
    
    console.log(`Device found for patient ${patientId}:`, device.deviceInfo);
    
    // Get device ID for real-time vitals lookup
    const deviceId = Object.keys(iotDevices).find(id => iotDevices[id] === device);
    const liveVitals = deviceId ? realTimeVitals[deviceId] : null;
    
    // Prefer live vitals over stored vitals (check if it's a vital reading)
    if (liveVitals && typeof liveVitals === 'object' && 'heartRate' in liveVitals) {
      console.log(`✓ Retrieved LIVE vitals for patient ${patientId}:`, liveVitals);
      return liveVitals as VitalReading;
    }
    
    // Try to get patient-specific vitals first (new structure)
    if (device.vitals && device.vitals[patientId]) {
      const patientVitals = getPatientLatestVitals(device, patientId);
      if (patientVitals) {
        console.log(`✓ Retrieved vitals for patient ${patientId} (new structure):`, patientVitals);
        return patientVitals;
      }
    }
    
    // Fallback to latest vitals (old structure)
    const vitals = getLatestVitals(device);
    if (vitals && isVitalReading(vitals)) {
      console.log(`✓ Retrieved vitals for patient ${patientId} (fallback):`, vitals);
      return vitals;
    }
    
    // Additional fallback: search through all devices for this patient's vitals
    console.log(`Searching all devices for patient ${patientId} vitals...`);
    for (const searchDevice of iotDevicesArray) {
      if (searchDevice.vitals && searchDevice.vitals[patientId]) {
        const patientVitals = getPatientLatestVitals(searchDevice, patientId);
        if (patientVitals) {
          console.log(`✓ Found vitals for patient ${patientId} in alternate device:`, patientVitals);
          return patientVitals;
        }
      }
    }
    
    console.log(`No valid vitals found for patient ${patientId}`);
    return null;
  };

  // Type guard to check if reading is VitalReading
  const isVitalReading = (reading: any): reading is VitalReading => {
    return reading && 
           typeof reading === 'object' && 
           'heartRate' in reading && 
           'oxygenLevel' in reading && 
           'temperature' in reading && 
           'bloodPressure' in reading &&
           typeof reading.heartRate === 'number' &&
           typeof reading.oxygenLevel === 'number' &&
           typeof reading.temperature === 'number' &&
           reading.bloodPressure &&
           typeof reading.bloodPressure.systolic === 'number' &&
           typeof reading.bloodPressure.diastolic === 'number';
  };

  // Function to get health prediction from backend
  const getHealthPrediction = async (patientId: string) => {
    setLoadingPredictions(prev => ({ ...prev, [patientId]: true }));
    
    const apiUrl = `${API_BASE_URL}/predict/risk/${patientId}`;
    console.log('Making API call to:', apiUrl);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('API Response status:', response.status);
      console.log('API Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      
      console.log('Full API response for patient', patientId, ':', result);
      console.log('Response keys:', Object.keys(result));
      
      // Handle different possible response structures
      let predictionData = result.prediction_details || result.prediction || result;
      
      // Ensure the prediction has the current timestamp if predictedAt is missing
      if (!predictionData.predictedAt && !predictionData.predicted_at) {
        predictionData.predictedAt = new Date().toISOString();
      }
      
      console.log('Extracted prediction data:', predictionData);
      
      // Store the prediction result with force update
      setPredictionResults(prev => {
        const newState = {
          ...prev,
          [patientId]: {
            ...predictionData,
            // Force update timestamp to ensure it's always current
            lastUpdated: new Date().toISOString()
          }
        };
        console.log('Updated predictionResults state:', newState);
        return newState;
      });

      console.log('Prediction details stored for', patientId, ':', predictionData);
      
    } catch (error) {
      console.error('Error getting health prediction:', error);
      alert('Failed to get health prediction. Please try again.');
    } finally {
      setLoadingPredictions(prev => ({ ...prev, [patientId]: false }));
    }
  };

  // Helper function to safely format timestamps in Pakistan Standard Time (PST - UTC+5)
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
      
      // Format in Pakistan Standard Time (UTC+5)
      const result = date.toLocaleString('en-PK', {
        timeZone: 'Asia/Karachi',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      
      console.log('Formatted result (PST):', result);
      return `${result} PST`;
    } catch (error) {
      console.error('Error formatting timestamp:', timestamp, error);
      return 'Invalid date format';
    }
  };

  const filteredPatients = patientsEntries.filter(([_patientId, patient]) =>
    patient.personalInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.currentStatus.diagnosis.toLowerCase().includes(searchTerm.toLowerCase())
  );



  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getVitalStatus = (vital: number, type: string) => {
    switch (type) {
      case 'heartRate':
        if (vital < 60 || vital > 100) return 'text-red-600';
        return 'text-green-600';
      case 'oxygenLevel':
        if (vital < 95) return 'text-red-600';
        return 'text-green-600';
      case 'temperature':
        if (vital < 97 || vital > 99.5) return 'text-red-600';
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Patient Monitoring</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={refreshVitals}
            disabled={vitalsLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${vitalsLoading ? 'animate-spin' : ''}`} />
            {vitalsLoading ? 'Refreshing...' : 'Refresh Vitals'}
          </button>
          <div className="text-right">
            <div className="text-sm text-gray-500">
              Live monitoring • Last updated: {new Date().toLocaleString('en-PK', {
                timeZone: 'Asia/Karachi',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              })} PST
            </div>
            {vitalsError && (
              <div className="text-xs text-red-500 mt-1">
                Error: {vitalsError}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Search patients by name or diagnosis..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Patients Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredPatients.map(([patientId, patient]) => {
          const vitals = getPatientVitals(patientId);
          
          // Prioritize fresh prediction results over context data
          // Only use patient.predictions as fallback if we don't have fresh results
          const freshPrediction = predictionResults[patientId];
          const contextPrediction = patient.predictions || {};
          
          // Use fresh prediction if available, otherwise fallback to context
          const currentPrediction = freshPrediction || contextPrediction;
          
          const isLoadingPrediction = loadingPredictions[patientId];
          
          // Check if vitals are from real-time source
          const device = iotDevicesArray.find(device => {
            if (device.deviceInfo?.currentPatientId === patientId) {
              return true;
            }
            const latestVitals = getLatestVitals(device);
            return latestVitals && 'patientId' in latestVitals && (latestVitals as any).patientId === patientId;
          });
          const deviceId = device ? Object.keys(iotDevices).find(id => iotDevices[id] === device) : null;
          const isRealTimeVitals = deviceId && realTimeVitals[deviceId];
          
          // More detailed debugging
          console.log(`=== Patient ${patientId} Debug Info ===`);
          console.log('predictionResults state:', predictionResults);
          console.log('freshPrediction for this patient:', freshPrediction);
          console.log('contextPrediction fallback:', contextPrediction);
          console.log('currentPrediction selected:', currentPrediction);
          console.log('isRealTimeVitals:', isRealTimeVitals);
          console.log('deviceId:', deviceId);
          
          // Provide default values for prediction data
          const riskLevel = currentPrediction.riskLevel || currentPrediction.risk_level || 'Unknown';
          const riskScore = currentPrediction.riskScore || currentPrediction.risk_score || 0;
          const confidence = currentPrediction.confidence || 0;
          const recommendations = currentPrediction.recommendations || [];
          
          // Get the most recent prediction timestamp - prioritize the latest
          const predictedAt = currentPrediction.predictedAt || 
                            currentPrediction.predicted_at || 
                            currentPrediction.lastUpdated ||
                            (currentPrediction.timestamp ? currentPrediction.timestamp : null);
          
          // Determine if this is fresh data or context data
          const isFreshPrediction = !!freshPrediction;
          
          // Debug logging
          console.log(`Patient ${patientId} extracted values:`, {
            riskLevel,
            riskScore,
            confidence,
            recommendations,
            predictedAt,
            isFreshPrediction,
            dataSource: isFreshPrediction ? 'Fresh API Result' : 'Context Fallback'
          });
          
          return (
            <div key={patientId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                      {patient.personalInfo.ward && ` • ${patient.personalInfo.ward}`}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRiskLevelColor(riskLevel)}`}>
                      {riskLevel} Risk
                    </span>
                    {isRealTimeVitals && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                        Live
                      </span>
                    )}
                    <button
                      onClick={() => getHealthPrediction(patientId)}
                      disabled={isLoadingPrediction}
                      className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingPrediction ? (
                        <>
                          <Loader className="animate-spin h-4 w-4 mr-2" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4 mr-2" />
                          Get Prediction
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {vitals && isVitalReading(vitals) ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                          <Heart className="h-4 w-4 text-red-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Heart Rate</p>
                          <p className={`text-lg font-semibold ${getVitalStatus(vitals.heartRate, 'heartRate')}`}>
                            {vitals.heartRate.toFixed(1)} bpm
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Droplets className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Oxygen Level</p>
                          <p className={`text-lg font-semibold ${getVitalStatus(vitals.oxygenLevel, 'oxygenLevel')}`}>
                            {vitals.oxygenLevel.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <Thermometer className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Temperature</p>
                          <p className={`text-lg font-semibold ${getVitalStatus(vitals.temperature, 'temperature')}`}>
                            {vitals.temperature.toFixed(1)}°F
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Activity className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Blood Pressure</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {Math.round(vitals.bloodPressure.systolic)}/{Math.round(vitals.bloodPressure.diastolic)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                      {riskLevel === 'Unknown' ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-500">
                            No prediction available. Click "Get Prediction" to analyze patient risk.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Risk Score:</span>
                            <span className="font-semibold text-gray-900">{riskScore.toFixed ? riskScore.toFixed(1) : riskScore}%</span>
                          </div>
                          <div className="flex justify-between items-center text-sm mt-1">
                            <span className="text-gray-600">Confidence:</span>
                            <span className="font-semibold text-gray-900">
                              {Math.round(confidence * 100)}%
                            </span>
                          </div>
                          {recommendations && recommendations.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-600 mb-1">AI Recommendations:</p>
                              <ul className="text-xs text-gray-900 space-y-1">
                                {recommendations.map((rec: string, index: number) => (
                                  <li key={index} className="flex items-start space-x-1">
                                    <span className="text-blue-500 mt-0.5">•</span>
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      )}
                      <div className="mt-2">
                        <p className="text-xs text-gray-600">
                          {isRealTimeVitals ? 'Live vitals update:' : 'Last vitals update:'}
                        </p>
                        <p className="text-xs text-gray-900">
                          {vitals?.timestamp ? formatTimestamp(vitals.timestamp) : 'No timestamp available'}
                        </p>
                        {/* Debug: Show raw timestamp */}
                        {vitals?.timestamp && (
                          <p className="text-xs text-gray-400 italic">
                            Raw: {vitals.timestamp}
                          </p>
                        )}
                        {isRealTimeVitals && (
                          <p className="text-xs text-green-600 font-medium">
                            ✓ Real-time data from monitor
                          </p>
                        )}
                      </div>
                      {predictedAt && (
                        <div className="mt-1">
                          <p className="text-xs text-gray-600">Prediction made:</p>
                          <p className="text-xs text-green-700 font-medium">
                            {formatTimestamp(predictedAt)}
                            {isFreshPrediction && currentPrediction.lastUpdated && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Fresh
                              </span>
                            )}
                            {!isFreshPrediction && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                Cached
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No monitoring device connected</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PatientMonitoring;