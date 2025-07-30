import { API_BASE_URL } from '../api/config';

// Utility function to normalize patient IDs
const normalizePatientId = (patientId: string): string => {
  if (!patientId) return '';
  
  // Convert P1001 -> patient_1001
  if (patientId.startsWith('P')) {
    return `patient_${patientId.substring(1)}`;
  }
  
  // Already in correct format
  if (patientId.startsWith('patient_')) {
    return patientId;
  }
  
  // Plain number -> patient_number
  if (/^\d+$/.test(patientId)) {
    return `patient_${patientId}`;
  }
  
  return patientId;
};

// Utility function to create requests with timeout
const createRequestWithTimeout = (url: string, options: RequestInit = {}, timeout: number = 10000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  return fetch(url, {
    ...options,
    signal: controller.signal
  }).finally(() => clearTimeout(timeoutId));
};

// Interfaces
interface Patient {
  id: string;
  name: string;
  status: string;
  roomNumber: string;
  bedNumber?: string;
  vitalSigns: {
    heartRate: number;
    bloodPressure: string;
    temperature: number;
    oxygenLevel: number;
  };
  lastUpdated: string;
  personalInfo?: any;
  currentStatus?: any;
  medicalHistory?: any;
  predictions?: any;
}

interface PatientRecord {
  id: string;
  personalInfo: {
    name: string;
    age: number;
    gender: string;
    roomId: string;
    bedId: string;
  };
  medicalHistory: {
    conditions: string[];
    medications: any[];
    allergies: string[];
  };
  currentStatus: {
    status: string;
    admissionDate: string;
    discharge?: string;
  };
}

interface VitalSigns {
  heartRate: number;
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
  temperature: number;
  oxygenLevel: number;
  respiratoryRate?: number;
  glucose?: number;
  timestamp: string;
  patientId?: string;
}

interface EnvironmentalData {
  temperature: number;
  humidity: number;
  airQuality: number;
  co2Level: number;
  lightLevel: number;
  noiseLevel: number;
  timestamp: string;
}

interface Room {
  number: string;
  status: 'occupied' | 'available' | 'maintenance';
  patientId?: string;
  patientName?: string;
  type: string;
  floor: number;
  lastCleaned?: string;
}

interface RoomOccupancy {
  roomId: string;
  roomType: string;
  isOccupied: boolean;
  totalBeds: number;
  occupiedBeds: number;
  patients: Array<{
    patientId: string;
    name: string;
    bedId: string;
  }>;
}

interface Alert {
  id: string;
  roomNumber: string;
  priority: 'low' | 'medium' | 'high';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  patientId?: string;
  patientName?: string;
  deviceId?: string;
}

interface HealthRiskPrediction {
  patientId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  predictedConditions: string[];
  recommendations: string[];
  lastAssessment: string;
}
// Helper to parse backend timestamp format
const parseBackendTimestamp = (timestamp: string): string => {
  if (!timestamp) {
    return new Date().toISOString();
  }
  
  try {
    // Convert "2025-07-30_10-26-36" to "2025-07-30T10:26:36"
    const isoFormat = timestamp.replace('_', 'T').replace(/-/g, ':');
    const date = new Date(isoFormat);
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp format:', timestamp);
      return new Date().toISOString();
    }
    
    return date.toISOString();
  } catch (error) {
    console.warn('Error parsing timestamp:', timestamp, error);
    return new Date().toISOString();
  }
};
// New API Methods
const fetchPatientRecordFromAPI = async (patientId: string): Promise<PatientRecord> => {
  try {
    const backendPatientId = normalizePatientId(patientId);
    
    const response = await createRequestWithTimeout(`${API_BASE_URL}/patients/${backendPatientId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Patient with ID "${patientId}" not found`);
      }
      throw new Error(`Failed to fetch patient record (Status: ${response.status})`);
    }
    
    const patientData = await response.json();
    
    // Parse and format the admission date from personalInfo and put it in currentStatus for consistency
    const formattedAdmissionDate = patientData.personalInfo?.admissionDate 
      ? parseBackendTimestamp(patientData.personalInfo.admissionDate)
      : null;
    
    return {
      id: backendPatientId,
      personalInfo: patientData.personalInfo || {},
      medicalHistory: patientData.medicalHistory || {},
      currentStatus: {
        ...patientData.currentStatus,
        admissionDate: formattedAdmissionDate || patientData.currentStatus?.admissionDate
      }
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out - server may be unavailable');
    }
    console.error('Error fetching patient record:', error);
    throw error;
  }
};


// Helper to get latest vitals from timestamp-based keys
const getLatestVitalsFromTimestampKeys = (vitalsObject: any): any => {
  if (!vitalsObject || typeof vitalsObject !== 'object') {
    return null;
  }
  
  // Get all timestamp keys and find the latest one
  const timestampKeys = Object.keys(vitalsObject).filter(key => 
    key.match(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/)
  );
  
  if (timestampKeys.length === 0) {
    return null;
  }
  
  // Sort timestamps and get the latest
  timestampKeys.sort((a, b) => b.localeCompare(a));
  const latestTimestamp = timestampKeys[0];
  
  return vitalsObject[latestTimestamp];
};

// Helper to parse vitals data from string format
const parseVitalsData = (vitalsString: any): any => {
  if (typeof vitalsString === 'object') {
    return vitalsString; // Already parsed
  }
  
  if (typeof vitalsString === 'string') {
    try {
      // Try to parse if it's a JSON string
      return JSON.parse(vitalsString);
    } catch {
      // If not JSON, it might be in the format we saw in the API response
      // Extract values using regex or simple parsing
      const vitals: any = {};
      
      // Extract common vital signs
      const heartRateMatch = vitalsString.match(/heartRate=([^;]+)/);
      const tempMatch = vitalsString.match(/temperature=([^;]+)/);
      const oxygenMatch = vitalsString.match(/oxygenLevel=([^;]+)/);
      const respMatch = vitalsString.match(/respiratoryRate=([^;]+)/);
      const glucoseMatch = vitalsString.match(/glucose=([^;]+)/);
      const timestampMatch = vitalsString.match(/timestamp=([^}]+)/);
      
      if (heartRateMatch) vitals.heartRate = parseFloat(heartRateMatch[1]);
      if (tempMatch) vitals.temperature = parseFloat(tempMatch[1]);
      if (oxygenMatch) vitals.oxygenLevel = parseFloat(oxygenMatch[1]);
      if (respMatch) vitals.respiratoryRate = parseFloat(respMatch[1]);
      if (glucoseMatch) vitals.glucose = parseFloat(glucoseMatch[1]);
      if (timestampMatch) vitals.timestamp = timestampMatch[1].trim();
      
      return vitals;
    }
  }
  
  return vitalsString || {};
};

// Helper function to parse backend timestamp format
const fetchPatientVitalsFromAPI = async (patientId: string): Promise<VitalSigns> => {
  try {
    const backendPatientId = normalizePatientId(patientId);
    console.log(`🩺 Fetching vitals for patient: ${backendPatientId}`);
    
    // First, try to get vitals from patient predictions (most recent)
    const patientResponse = await createRequestWithTimeout(`${API_BASE_URL}/patients/${backendPatientId}`);
    if (patientResponse.ok) {
      const patientData = await patientResponse.json();
      console.log('✅ Patient data received:', patientData);
      
      // Get vitals from latest prediction
      if (patientData.predictions && patientData.predictions.vitalsUsed) {
        const vitals = patientData.predictions.vitalsUsed;
        console.log('📊 Using vitals from predictions:', vitals);
        
        // Parse blood pressure if it exists
        let bloodPressure = { systolic: 0, diastolic: 0 };
        if (vitals.bloodPressure && typeof vitals.bloodPressure === 'object') {
          bloodPressure = {
            systolic: vitals.bloodPressure.systolic || 0,
            diastolic: vitals.bloodPressure.diastolic || 0
          };
        }
        
        return {
          heartRate: vitals.heartRate || 0,
          bloodPressure: bloodPressure,
          temperature: vitals.temperature || 0,
          oxygenLevel: vitals.oxygenLevel || 0,
          respiratoryRate: vitals.respiratoryRate || 0,
          glucose: vitals.glucose || 0,
          timestamp: parseBackendTimestamp(patientData.predictions.predictedAt),
          patientId: backendPatientId
        };
      }
    }
    
    // Fallback: Search through IoT devices for vitals monitors
    console.log('🔍 Searching IoT devices for vitals monitor...');
    const devicesResponse = await createRequestWithTimeout(`${API_BASE_URL}/iotData`);
    if (!devicesResponse.ok) {
      throw new Error(`Failed to fetch IoT devices (Status: ${devicesResponse.status})`);
    }
    
    const devices = await devicesResponse.json();
    console.log('📦 Available devices:', Object.keys(devices));
    
    // Find monitor for this patient
    for (const [deviceId, device] of Object.entries(devices as Record<string, any>)) {
      const deviceInfo = device.deviceInfo || {};
      
      if (deviceInfo.type === 'vitals_monitor' && deviceInfo.currentPatientId === backendPatientId) {
        console.log(`🎯 Found monitor ${deviceId} for patient ${backendPatientId}`);
        
        // Get latest vitals from this monitor
        if (device.vitals && device.vitals[backendPatientId]) {
          const patientVitals = device.vitals[backendPatientId];
          const latestVitals = getLatestVitalsFromTimestampKeys(patientVitals);
          
          if (latestVitals) {
            console.log('📊 Latest vitals from monitor:', latestVitals);
            
            // Parse the vitals object (it comes as a string representation)
            const vitalsData = parseVitalsData(latestVitals);
            
            return {
              heartRate: vitalsData.heartRate || 0,
              bloodPressure: vitalsData.bloodPressure || { systolic: 0, diastolic: 0 },
              temperature: vitalsData.temperature || 0,
              oxygenLevel: vitalsData.oxygenLevel || 0,
              respiratoryRate: vitalsData.respiratoryRate || 0,
              glucose: vitalsData.glucose || 0,
              timestamp: parseBackendTimestamp(vitalsData.timestamp),
              patientId: backendPatientId
            };
          }
        }
      }
    }
    
    throw new Error(`No vitals found for patient ${patientId}`);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out - server may be unavailable');
    }
    console.error('❌ Error fetching patient vitals:', error);
    throw error;
  }
};

const fetchMonitorVitalsFromAPI = async (roomNumber: string): Promise<VitalSigns | null> => {
  try {
    console.log(`🖥️ Fetching monitor vitals for room: ${roomNumber}`);
    
    // Get all IoT devices to find monitor in the room
    const devicesResponse = await createRequestWithTimeout(`${API_BASE_URL}/iotData`);
    if (!devicesResponse.ok) {
      throw new Error(`Failed to fetch IoT devices (Status: ${devicesResponse.status})`);
    }
    const devices = await devicesResponse.json();
    
    // Find vitals monitor in the specified room
    let monitor = null;
    for (const [deviceId, deviceData] of Object.entries(devices as Record<string, any>)) {
      if (deviceData.deviceInfo?.type === 'vitals_monitor' && 
          deviceData.deviceInfo?.roomId === `room_${roomNumber}`) {
        monitor = { deviceId, ...deviceData };
        break;
      }
    }
    
    if (!monitor) {
      console.warn(`⚠️ No vitals monitor found in room ${roomNumber}`);
      return null;
    }
    
    console.log(`📱 Found monitor: ${monitor.deviceId}`);
    
    // Get latest vitals from the monitor
    if (monitor.vitals) {
      const patientId = monitor.deviceInfo?.currentPatientId;
      if (patientId && monitor.vitals[patientId]) {
        const patientVitals = monitor.vitals[patientId];
        const latestVitals = getLatestVitalsFromTimestampKeys(patientVitals);
        
        if (latestVitals) {
          console.log('📊 Latest vitals from monitor:', latestVitals);
          
          // Parse the vitals data
          const vitalsData = parseVitalsData(latestVitals);
          
          return {
            heartRate: vitalsData.heartRate || 0,
            bloodPressure: vitalsData.bloodPressure || { systolic: 0, diastolic: 0 },
            temperature: vitalsData.temperature || 0,
            oxygenLevel: vitalsData.oxygenLevel || 0,
            respiratoryRate: vitalsData.respiratoryRate || 0,
            glucose: vitalsData.glucose || 0,
            timestamp: parseBackendTimestamp(vitalsData.timestamp),
            patientId: patientId
          };
        }
      }
    }
    
    console.warn(`⚠️ No vitals data found for monitor in room ${roomNumber}`);
    return null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out - server may be unavailable');
    }
    console.error('❌ Error fetching monitor vitals:', error);
    return null;
  }
};

// Helper function to get latest vitals from timestamp-keyed object
// Helper function to map environmental data with device info
const mapToEnvironmentalData = (vitalsData: any): EnvironmentalData => {
  const safeValue = (value: any, defaultValue: number = 0): number => {
    const parsed = typeof value === 'number' ? value : parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  return {
    temperature: safeValue(vitalsData.temperature),
    humidity: safeValue(vitalsData.humidity),
    airQuality: safeValue(vitalsData.airQuality),
    co2Level: safeValue(vitalsData.co2Level),
    lightLevel: safeValue(vitalsData.lightLevel),
    noiseLevel: safeValue(vitalsData.noiseLevel),
    timestamp: vitalsData.timestamp || new Date().toISOString()
  };
};

const fetchEnvironmentalDataFromAPI = async (roomNumber: string): Promise<EnvironmentalData | null> => {
  try {
    console.log(`🌡️ Fetching environmental data for room: ${roomNumber}`);
    
    // Use specific sensor ID pattern: env_sensor_1 for room_1, env_sensor_2 for room_2, etc.
    const sensorId = `env_sensor_${roomNumber}`;
    
    try {
      console.log(`🎯 Fetching from sensor: ${sensorId}`);
      const response = await createRequestWithTimeout(`${API_BASE_URL}/iotData/${sensorId}`);
      
      if (response.ok) {
        const sensorData = await response.json();
        console.log('✅ Environmental sensor response:', sensorData);
        
        if (sensorData && sensorData.vitals) {
          // Get the latest vitals from the vitals object (timestamp-keyed)
          const latestVitals = getLatestVitalsFromTimestampKeys(sensorData.vitals);
          if (latestVitals) {
            console.log('📊 Latest vitals found:', latestVitals);
            return mapToEnvironmentalData(latestVitals);
          }
        }
      }
    } catch (sensorError) {
      console.warn(`⚠️ Failed to fetch from sensor ${sensorId}:`, sensorError);
    }

    // Fallback: Try other sensor IDs
    const fallbackSensorIds = ['env_sensor_1', 'env_sensor_2'];
    for (const id of fallbackSensorIds) {
      if (id === sensorId) continue; // Skip already tried sensor
      
      try {
        console.log(`🔍 Trying fallback sensor ID: ${id}`);
        const response = await createRequestWithTimeout(`${API_BASE_URL}/iotData/${id}`);
        
        if (response.ok) {
          const sensorData = await response.json();
          if (sensorData && sensorData.vitals) {
            const latestVitals = getLatestVitalsFromTimestampKeys(sensorData.vitals);
            if (latestVitals) {
              console.log(`📊 Found vitals from fallback sensor ${id}:`, latestVitals);
              return mapToEnvironmentalData(latestVitals);
            }
          }
        }
      } catch (err) {
        console.warn(`⚠️ Failed to fetch from fallback ${id}:`, err);
      }
    }

    // Final fallback: Try general IoT data endpoint
    console.log('🔄 Trying general IoT data endpoint...');
    const fallbackResponse = await createRequestWithTimeout(`${API_BASE_URL}/iotData`);
    
    if (fallbackResponse.ok) {
      const devicesData = await fallbackResponse.json();
      console.log('📦 General IoT data response:', devicesData);
      
      // Look for environmental sensor data
      for (const [deviceId, deviceData] of Object.entries(devicesData as Record<string, any>)) {
        const deviceInfo = deviceData.deviceInfo || {};
        
        if (deviceInfo.type === 'environmental_sensor' && deviceData.vitals) {
          const latestVitals = getLatestVitalsFromTimestampKeys(deviceData.vitals);
          if (latestVitals) {
            console.log(`🎯 Found environmental sensor from general endpoint (${deviceId}):`, latestVitals);
            return mapToEnvironmentalData(latestVitals);
          }
        }
      }
    }

    console.warn(`⚠️ No environmental data found for room ${roomNumber}`);
    return null;

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out - server may be unavailable');
    }
    console.error('❌ Error fetching environmental data:', error);
    return null;
  }
};

const fetchHealthRiskPredictionFromAPI = async (patientId: string): Promise<HealthRiskPrediction> => {
  try {
    const backendPatientId = normalizePatientId(patientId);
    console.log(`🩺 Fetching health risk prediction for patient: ${backendPatientId}`);
    
    const response = await createRequestWithTimeout(`${API_BASE_URL}/predict/risk/${backendPatientId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`No risk prediction available for patient ${patientId}`);
      }
      throw new Error(`Failed to fetch risk prediction (Status: ${response.status})`);
    }
    
    const predictionData = await response.json();
    console.log('✅ Raw risk prediction data from API:', predictionData);
    
    // Extract prediction details from the correct structure
    const details = predictionData.prediction_details || predictionData;
    
    // Convert prediction data to risk prediction format
    const mappedData = {
      patientId: backendPatientId,
      riskLevel: (details.riskLevel || predictionData.prediction || 'low').toLowerCase(),
      riskScore: details.riskScore || details.confidence * 100 || 0,
      factors: details.factors || [],
      predictedConditions: details.factors || [],
      recommendations: details.recommendations || ['Continue monitoring'],
      lastAssessment: details.predictedAt || new Date().toISOString(),
      predictedAt: details.predictedAt || new Date().toISOString()
    };
    
    console.log('📊 Mapped health risk data:', mappedData);
    return mappedData;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out - server may be unavailable');
    }
    console.error('❌ Error fetching health risk prediction:', error);
    throw error;
  }
};

const fetchRoomOccupancyFromAPI = async (roomNumber?: string): Promise<RoomOccupancy[]> => {
  try {
    const url = roomNumber 
      ? `${API_BASE_URL}/rooms/room_${roomNumber}`
      : `${API_BASE_URL}/rooms`;
    
    const response = await createRequestWithTimeout(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch room data (Status: ${response.status})`);
    }
    
    if (roomNumber) {
      const roomData = await response.json();
      
      // Convert single room data to RoomOccupancy format
      return [{
        roomId: roomData.roomId || `room_${roomNumber}`,
        roomType: roomData.roomType || roomData.type || 'Unknown',
        isOccupied: roomData.status === 'occupied',
        totalBeds: roomData.capacity || 1,
        occupiedBeds: roomData.assignedPatient ? 1 : 0,
        patients: roomData.assignedPatient ? [{
          patientId: roomData.assignedPatient,
          name: 'Patient', // Would need to fetch patient details
          bedId: 'bed_1'
        }] : []
      }];
    } else {
      const roomsData = await response.json();
      
      // Convert rooms object to RoomOccupancy array
      const roomsArray: RoomOccupancy[] = [];
      for (const [roomId, roomData] of Object.entries(roomsData as Record<string, any>)) {
        roomsArray.push({
          roomId: roomId,
          roomType: roomData.roomType || roomData.type || 'Unknown',
          isOccupied: roomData.status === 'occupied',
          totalBeds: roomData.capacity || 1,
          occupiedBeds: roomData.assignedPatient ? 1 : 0,
          patients: roomData.assignedPatient ? [{
            patientId: roomData.assignedPatient,
            name: 'Patient', // Would need to fetch patient details
            bedId: 'bed_1'
          }] : []
        });
      }
      return roomsArray;
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out - server may be unavailable');
    }
    console.error('Error fetching room occupancy:', error);
    throw error;
  }
};

const fetchRoomAlertsFromAPI = async (roomNumber: string): Promise<Alert[]> => {
  try {
    // First get all IoT devices to find monitors in the room
    const devicesResponse = await createRequestWithTimeout(`${API_BASE_URL}/iotData`);
    if (!devicesResponse.ok) {
      throw new Error(`Failed to fetch IoT devices (Status: ${devicesResponse.status})`);
    }
    const devices = await devicesResponse.json();
    
    // Find monitors in the specified room
    const roomDevices = Object.entries(devices).filter(([, device]: [string, any]) => {
      const deviceInfo = device.deviceInfo || {};
      return deviceInfo.roomId === `room_${roomNumber}` && 
             (deviceInfo.type === 'vitals_monitor' || deviceInfo.type === 'environmental_sensor');
    });
    
    if (roomDevices.length === 0) {
      return []; // No devices in this room
    }
    
    // Get alerts from each device in the room using specific monitor alerts endpoint
    const allRoomAlerts: Alert[] = [];
    
    for (const [deviceId] of roomDevices) {
      try {
        const alertsResponse = await createRequestWithTimeout(`${API_BASE_URL}/iotData/${deviceId}/alerts/latest?limit=20&include_resolved=false`);
        if (alertsResponse.ok) {
          const alertsData = await alertsResponse.json();
          const deviceAlerts = alertsData.alerts || [];
          
          // Convert to frontend format
          const formattedAlerts = deviceAlerts.map((alert: any) => ({
            id: alert.id || alert.timestamp || Date.now().toString(),
            roomNumber: roomNumber,
            priority: alert.severity_level?.toLowerCase() || alert.severity?.toLowerCase() || alert.type || 'medium',
            message: alert.message || alert.description || 'No description',
            timestamp: alert.timestamp || new Date().toISOString(),
            acknowledged: alert.resolved || false,
            deviceId: deviceId,
            patientId: alert.patient_id || '',
            patientName: alert.patient_name || ''
          }));
          
          allRoomAlerts.push(...formattedAlerts);
        }
      } catch (deviceError) {
        console.error(`Error fetching alerts for device ${deviceId}:`, deviceError);
        // Continue with other devices
      }
    }
    
    // Sort by timestamp (newest first) with proper date handling
    allRoomAlerts.sort((a, b) => {
      try {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        
        // Handle invalid dates
        if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
        if (isNaN(dateA.getTime())) return 1; // Push invalid dates to end
        if (isNaN(dateB.getTime())) return -1;
        
        return dateB.getTime() - dateA.getTime();
      } catch (error) {
        console.warn('Error sorting alerts by timestamp:', error);
        return 0;
      }
    });
    
    return allRoomAlerts;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out - server may be unavailable');
    }
    console.error('Error fetching room alerts:', error);
    throw error;
  }
};

const fetchMonitorAlertsFromAPI = async (monitorId: string): Promise<Alert[]> => {
  try {
    // Get alerts from specific monitor using IoT alerts endpoint
    const alertsResponse = await createRequestWithTimeout(`${API_BASE_URL}/iotData/${monitorId}/alerts/latest?limit=50&include_resolved=false`);
    
    if (!alertsResponse.ok) {
      throw new Error(`Failed to fetch alerts from monitor (Status: ${alertsResponse.status})`);
    }
    
    const alertsData = await alertsResponse.json();
    const deviceAlerts = alertsData.alerts || [];
    
    // Convert to frontend format
    return deviceAlerts.map((alert: any) => ({
      id: alert.id || alert.timestamp || Date.now().toString(),
      roomNumber: '', // Will be filled by caller if needed
      priority: alert.severity_level?.toLowerCase() || alert.severity?.toLowerCase() || alert.type || 'medium',
      message: alert.message || alert.description || 'No description',
      timestamp: alert.timestamp || new Date().toISOString(),
      acknowledged: alert.resolved || false,
      deviceId: monitorId,
      patientId: alert.patient_id || '',
      patientName: alert.patient_name || ''
    }));
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out - server may be unavailable');
    }
    console.error(`Error fetching alerts for monitor ${monitorId}:`, error);
    throw error;
  }
};

// API Methods using fetch
const fetchPatientsFromAPI = async (status: string): Promise<Patient[]> => {
  try {
    const url = new URL(`${API_BASE_URL}/patients`);
    if (status !== 'all') {
      url.searchParams.append('status', status);
    }
    
    const response = await createRequestWithTimeout(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to fetch patients (Status: ${response.status})`);
    }
    
    const patientsObject = await response.json();
    
    // Convert the patients object to an array and filter by status if needed
    const patientsArray: Patient[] = [];
    for (const [patientId, patientData] of Object.entries(patientsObject as Record<string, any>)) {
      const patient = {
        id: patientId,
        name: patientData.personalInfo?.name || 'Unknown',
        status: patientData.currentStatus?.status || 'Unknown',
        roomNumber: patientData.personalInfo?.roomId?.replace('room_', '') || 'Not assigned',
        bedNumber: patientData.personalInfo?.bedId?.replace('bed_', '') || 'Not assigned',
        vitalSigns: {
          heartRate: 0, // Will be fetched separately if needed
          bloodPressure: 'N/A',
          temperature: 0,
          oxygenLevel: 0
        },
        lastUpdated: patientData.currentStatus?.lastUpdated || new Date().toISOString(),
        // Include full patient data for detailed queries
        personalInfo: patientData.personalInfo,
        currentStatus: patientData.currentStatus,
        medicalHistory: patientData.medicalHistory,
        predictions: patientData.predictions
      };
      
      // Filter by status if specified
      if (status === 'all' || patient.status === status) {
        patientsArray.push(patient);
      }
    }
    
    return patientsArray;
  } catch (error) {
    console.error('Error fetching patients by status:', error);
    throw error;
  }
};

const searchPatientsByNameFromAPI = async (searchName: string): Promise<Patient[]> => {
  try {
    const response = await createRequestWithTimeout(`${API_BASE_URL}/patients`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch patients (Status: ${response.status})`);
    }
    
    const patientsObject = await response.json();
    
    // Convert the patients object to an array and filter by name
    const patientsArray: Patient[] = [];
    const searchLower = searchName.toLowerCase();
    
    for (const [patientId, patientData] of Object.entries(patientsObject as Record<string, any>)) {
      const patient = {
        id: patientId,
        name: patientData.personalInfo?.name || 'Unknown',
        status: patientData.currentStatus?.status || 'Unknown',
        roomNumber: patientData.personalInfo?.roomId?.replace('room_', '') || null,
        bedNumber: patientData.personalInfo?.bedId?.replace('bed_', '') || null,
        personalInfo: patientData.personalInfo,
        currentStatus: patientData.currentStatus,
        medicalHistory: patientData.medicalHistory,
        predictions: patientData.predictions,
        vitalSigns: {
          heartRate: 0,
          bloodPressure: 'N/A',
          temperature: 0,
          oxygenLevel: 0
        }, // Default values, will be fetched separately if needed
        lastUpdated: patientData.currentStatus?.lastUpdated || new Date().toISOString()
      };
      
      // Search by name (case insensitive)
      if (patient.name.toLowerCase().includes(searchLower)) {
        patientsArray.push(patient);
      }
    }
    
    return patientsArray;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out - server may be unavailable');
    }
    console.error('Error searching patients by name:', error);
    throw error;
  }
};

const fetchRoomsFromAPI = async (status: string): Promise<Room[]> => {
  try {
    const url = new URL(`${API_BASE_URL}/rooms`);
    if (status !== 'all') {
      url.searchParams.append('status', status);
    }
    
    const response = await createRequestWithTimeout(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to fetch rooms (Status: ${response.status})`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching room status:', error);
    throw error;
  }
};

const fetchAlertsFromAPI = async (priority: string): Promise<Alert[]> => {
  try {
    const response = await createRequestWithTimeout(`${API_BASE_URL}/alerts`);
    if (!response.ok) {
      throw new Error(`Failed to fetch alerts (Status: ${response.status})`);
    }
    
    const alertsArray = await response.json();
    
    // Convert backend alert format to frontend format
    const convertedAlerts: Alert[] = alertsArray.map((alert: any) => ({
      id: alert.timestamp || Date.now().toString(),
      roomNumber: alert.device_id ? alert.device_id.replace('monitor_', 'Room ') : 'Unknown',
      priority: alert.severity_level?.toLowerCase() || alert.type || 'medium',
      message: alert.message || 'No description',
      timestamp: alert.timestamp || new Date().toISOString(),
      acknowledged: alert.resolved || false,
      deviceId: alert.device_id || 'Unknown',
      patientId: '', // Not directly available in alerts
      patientName: ''
    }));
    
    // Filter by priority if not 'all'
    if (priority === 'all') {
      return convertedAlerts;
    } else {
      return convertedAlerts.filter(alert => alert.priority === priority);
    }
  } catch (error) {
    console.error('Error fetching alerts:', error);
    throw error;
  }
};

// Export wrapped functions
export const fetchPatientsByStatus = async (status: string): Promise<Patient[]> => {
  try {
    return await fetchPatientsFromAPI(status);
  } catch (error) {
    console.error('Error fetching patients by status:', error);
    throw error; // Don't use fallback, let the error bubble up
  }
};

export const fetchRoomStatus = fetchRoomsFromAPI;
export const fetchAlerts = async (priority: string): Promise<Alert[]> => {
  try {
    return await fetchAlertsFromAPI(priority);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    throw error; // Don't use fallback, let the error bubble up
  }
};

export const fetchPatientRecord = async (patientId: string): Promise<PatientRecord> => {
  try {
    return await fetchPatientRecordFromAPI(patientId);
  } catch (error) {
    console.error('Error fetching patient record:', error);
    throw error; // Don't use fallback, let the error bubble up
  }
};

export const fetchPatientVitals = async (patientId: string): Promise<VitalSigns> => {
  try {
    return await fetchPatientVitalsFromAPI(patientId);
  } catch (error) {
    console.error('Error fetching patient vitals:', error);
    throw error; // Don't use fallback, let the error bubble up
  }
};

export const fetchMonitorVitals = fetchMonitorVitalsFromAPI;
export const fetchEnvironmentalData = async (roomNumber: string): Promise<EnvironmentalData | null> => {
  try {
    return await fetchEnvironmentalDataFromAPI(roomNumber);
  } catch (error) {
    console.warn('Environmental data API call failed, using fallback:', error);
    // Return mock environmental data as fallback
    return {
      temperature: 22.5,
      humidity: 45.0,
      airQuality: 85.0,
      co2Level: 400,
      lightLevel: 500,
      noiseLevel: 35.0,
      timestamp: new Date().toISOString()
    };
  }
};
export const fetchHealthRiskPrediction = async (patientId: string): Promise<HealthRiskPrediction> => {
  try {
    return await fetchHealthRiskPredictionFromAPI(patientId);
  } catch (error) {
    console.error('Error fetching health risk prediction:', error);
    throw error; // Don't use fallback, let the error bubble up
  }
};
export const fetchRoomOccupancy = fetchRoomOccupancyFromAPI;
export const fetchRoomAlerts = fetchRoomAlertsFromAPI;
export const fetchMonitorAlerts = fetchMonitorAlertsFromAPI;
export const searchPatientsByName = searchPatientsByNameFromAPI;