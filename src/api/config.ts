// Base URL for the backend API
const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
export const API_BASE_URL = baseUrl.trim(); // Remove any trailing/leading spaces

// Validate API configuration
export const validateApiConfig = () => {
    if (!API_BASE_URL) {
        throw new Error('API_BASE_URL is not configured. Please check your environment variables.');
    }
    
    try {
        new URL(API_BASE_URL);
    } catch (error) {
        throw new Error(`Invalid API_BASE_URL: ${API_BASE_URL}. Please provide a valid URL.`);
    }
    
    console.log('API Configuration:', { API_BASE_URL });
    return true;
};

// Check if API server is reachable
export const checkApiHealth = async (): Promise<boolean> => {
    try {
        // Use /docs endpoint since it's available and reliable
        const response = await fetch(`${API_BASE_URL}/docs`, { 
            method: 'GET',
            mode: 'cors'
        });
        console.log('API health check response:', response.status, response.statusText);
        return response.ok;
    } catch (error) {
        console.warn('API health check failed:', error);
        return false;
    }
};
// Feature flags
export const FEATURES = {
  VOICE_RECOGNITION: true,
  ADVANCED_QUERY: true
};

// Speech recognition configuration
export const SPEECH_RECOGNITION_CONFIG = {
  language: 'en-US',
  continuous: true,
  interimResults: true
};

// Types of supported queries
export const QUERY_TYPES = {
  PATIENT_STATUS: ['critical', 'stable', 'recovering', 'discharged'],
  ROOM_STATUS: ['occupied', 'available', 'maintenance'],
  ALERT_PRIORITY: ['high', 'medium', 'low']
};

// Common headers for API requests
export const DEFAULT_HEADERS = {
    'Content-Type': 'application/json',
};

// Timeout duration for API requests (in milliseconds)
export const REQUEST_TIMEOUT = 30000;

// API endpoints
export const ENDPOINTS = {
    // Authentication endpoints
    auth: {
        login: '/auth/login',
        signup: '/auth/signup',
        logout: '/auth/logout',
        me: '/auth/me',
        users: '/auth/users'
    },

    // Patient endpoints
    patients: {
        base: '/patients/',
        getAll: '/patients/',
        getById: (id: string) => `/patients/${id}/`,
        create: '/patients/',
        update: (id: string) => `/patients/${id}/`,
        delete: (id: string) => `/patients/${id}/`,
        vitals: (id: string) => `/patients/${id}/vitals/`,
        treatments: (id: string) => `/patients/${id}/treatments/`,
        byWard: (wardId: string) => `/patients/ward/${wardId}/`,
        byRisk: (riskLevel: string) => `/patients/risk/${riskLevel}/`,
    },

    // IoT endpoints
    iot: {
        base: '/iotData/',
        getAll: '/iotData/',
        getById: (id: string) => `/iotData/${id}/`,
        vitals: (deviceId: string) => `/iotData/${deviceId}/vitals/`,
        alerts: (deviceId: string) => `/iotData/${deviceId}/alerts/`,
    },

    // Staff endpoints
    staff: {
        base: '/staff/',
        getAll: '/staff/',
        getById: (id: string) => `/staff/${id}/`,
        create: '/staff/',
        update: (id: string) => `/staff/${id}/`,
        delete: (id: string) => `/staff/${id}/`,
        schedule: (id: string) => `/staff/${id}/schedule/`,
        updateSchedule: (id: string, date: string) => `/staff/${id}/schedule/${date}/`,
        bulkSchedule: (id: string) => `/staff/${id}/schedule/bulk/`,
        status: (id: string) => `/staff/${id}/status/`,
        dutyStatus: (id: string) => `/staff/${id}/duty-status/`,
        patients: (id: string) => `/staff/${id}/patients/`,
        workloadHistory: (id: string) => `/staff/${id}/workload-history/`,
        stats: '/staff/stats/',
        onDuty: '/staff/on-duty/',
        byWard: (wardId: string) => `/staff/by-ward/${wardId}/`,
        load: '/staff/load/',
        departments: '/staff/departments/',
        search: '/staff/search/',
    },

    // Predictions endpoints
    predictions: {
        base: '/predictions/',
        getAll: '/predictions/',
        getById: (id: string) => `/predictions/${id}/`,
        forPatient: (patientId: string) => `/predictions/patient/${patientId}/`,
    },

    // Alerts endpoints
    alerts: {
        base: '/alerts/',
        getAll: '/alerts/',
        getById: (id: string) => `/alerts/${id}/`,
        forPatient: (patientId: string) => `/alerts/patient/${patientId}/`,
        forDevice: (deviceId: string) => `/alerts/device/${deviceId}/`,
    },
} as const; 