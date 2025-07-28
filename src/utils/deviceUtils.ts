import { IoTDevice, VitalReading, EnvironmentalReading } from '../api/types';

/**
 * Type guard to check if a reading is a vital reading
 */
export const isVitalReading = (reading: VitalReading | EnvironmentalReading): reading is VitalReading => {
  return 'heartRate' in reading;
};

/**
 * Type guard to check if a reading is an environmental reading
 */
export const isEnvironmentalReading = (reading: VitalReading | EnvironmentalReading): reading is EnvironmentalReading => {
  return 'humidity' in reading;
};

/**
 * Check if device is an environmental sensor
 */
export const isEnvironmentalSensor = (device: IoTDevice): boolean => {
  return device.deviceInfo.type === 'environmental_sensor';
};

/**
 * Utility function to get the latest vitals from a device
 * Handles Firebase timestamp format (YYYY-MM-DD_HH-MM-SS)
 * Only returns vitals for the currently assigned patient
 */
export const getLatestVitals = (device: IoTDevice) => {
  if (!device.vitals || Object.keys(device.vitals).length === 0) {
    return null;
  }
  
  // Get currently assigned patient
  const currentPatientId = device.deviceInfo?.currentPatientId;
  if (!currentPatientId) {
    return null; // No patient assigned, no vitals to show
  }
  
  // Get vitals for current patient only
  const patientVitals = device.vitals[currentPatientId];
  if (!patientVitals || typeof patientVitals !== 'object') {
    return null;
  }
  
  const vitalsEntries = Object.entries(patientVitals as Record<string, VitalReading | EnvironmentalReading>);
  if (vitalsEntries.length === 0) {
    return null;
  }
  
  // Sort timestamps and get the latest one
  const sortedEntries = vitalsEntries
    .sort(([a], [b]) => {
      // Convert Firebase timestamp format (YYYY-MM-DD_HH-MM-SS) to comparable date
      const dateA = new Date(a.replace(/_/g, ' ').replace(/-/g, ':'));
      const dateB = new Date(b.replace(/_/g, ' ').replace(/-/g, ':'));
      return dateB.getTime() - dateA.getTime();
    });
  
  return sortedEntries.length > 0 ? sortedEntries[0][1] : null;
};

/**
 * Get latest vitals for a specific patient from a device
 */
export const getPatientLatestVitals = (device: IoTDevice, patientId: string): VitalReading | null => {
  if (!device.vitals || !device.vitals[patientId]) {
    return null;
  }
  
  const patientVitals = device.vitals[patientId];
  if (typeof patientVitals !== 'object' || Array.isArray(patientVitals)) {
    return null;
  }
  
  // Sort timestamps and get the latest one
  const sortedEntries = Object.entries(patientVitals as Record<string, VitalReading>)
    .sort(([a], [b]) => {
      const dateA = new Date(a.replace(/_/g, ' ').replace(/-/g, ':'));
      const dateB = new Date(b.replace(/_/g, ' ').replace(/-/g, ':'));
      return dateB.getTime() - dateA.getTime();
    });
  
  return sortedEntries.length > 0 ? sortedEntries[0][1] : null;
};

/**
 * Get latest environmental data from environmental sensors in a room
 */
export const getLatestEnvironmentalData = (devices: Record<string, IoTDevice>, roomId: string): EnvironmentalReading | null => {
  const envSensors = Object.values(devices).filter(device => 
    isEnvironmentalSensor(device) && device.deviceInfo.roomId === roomId
  );
  
  if (envSensors.length === 0) {
    return null;
  }
  
  // Get the latest reading from the first environmental sensor in the room
  const latestReading = getLatestVitals(envSensors[0]);
  return latestReading && isEnvironmentalReading(latestReading) ? latestReading : null;
};

/**
 * Get device status from the latest vitals
 */
export const getDeviceStatus = (device: IoTDevice): 'online' | 'offline' | 'maintenance' => {
  const latestVitals = getLatestVitals(device);
  return latestVitals?.deviceStatus || 'offline';
};

/**
 * Check if device is online
 */
export const isDeviceOnline = (device: IoTDevice): boolean => {
  return getDeviceStatus(device) === 'online';
};
