export interface Patient {
  personalInfo: {
    name: string;
    age: number;
    gender: string;
    admissionDate: string;
    ward: string;
    roomId: string;
    bedId: string;
  };
  medicalHistory: {
    conditions: string[];
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      startDate: string;
    }>;
    allergies: string[];
    lastCheckup: string;
    admissionReason: string;
  };
  currentStatus: {
    diagnosis: string;
    status: string;
    consciousness: string;
    mobility: string;
    lastUpdated: string;
  };
  predictions: {
    riskLevel: string;
    riskScore: number;
    confidence: number;
    predictedAt: string;
    nextPrediction: string;
    factors: string[];
  };
}

export interface StaffMember {
  personalInfo: {
    name: string;
    role: 'nurse' | 'doctor' | 'admin' | 'technician';
    department: string;
    specialization: string;
    contact: {
      email: string;
      phone: string;
    };
  };
  schedule: Record<string, {
    shiftStart: string;
    shiftEnd: string;
    ward: string;
    roomIds: string[];
    patientAssignments: string[];
    shiftType: 'day' | 'night' | 'on-call';
  }>;
  currentStatus: {
    onDuty: boolean;
    location: string;
    lastUpdated: string;
    workload: number;
  };
}

export interface VitalReading {
  heartRate: number;
  oxygenLevel: number;
  temperature: number;
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
  respiratoryRate: number;
  glucose: number;
  bedOccupancy: boolean;
  patientId: string;
  deviceStatus: 'online' | 'offline' | 'maintenance';
  batteryLevel: number;
  signalStrength: number;
  timestamp: string;
}

export interface EnvironmentalReading {
  temperature: number;
  humidity: number;
  airQuality: number;
  lightLevel: number;
  noiseLevel: number;
  pressure: number;
  co2Level: number;
  deviceStatus: 'online' | 'offline' | 'maintenance';
  batteryLevel: number;
  signalStrength: number;
  timestamp: string;
}

export interface IoTDevice {
  vitals: Record<string, VitalReading | EnvironmentalReading> | Record<string, Record<string, VitalReading | EnvironmentalReading>>;
  deviceInfo: {
    type: 'vitals_monitor' | 'environmental_sensor' | 'bed_sensor' | 'infusion_pump' | 'ventilator';
    manufacturer: string;
    model: string;
    roomId: string;
    bedId?: string;
    currentPatientId?: string;
    lastCalibrated: string;
    calibrationDue: string;
    maintenanceSchedule: string;
  };
  alerts: Record<string, {
    type: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: string;
    resolved: boolean;
    resolvedBy?: string;
    resolvedAt?: string;
    assignedTo?: string;
  }>;
} 


// Add Web Speech API types to the window object
export interface Window {
  SpeechRecognition: any;
  webkitSpeechRecognition: any;
}