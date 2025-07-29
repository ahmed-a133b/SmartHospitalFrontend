import { API_BASE_URL } from '../api/config';

// Interfaces
interface Patient {
  id: string;
  name: string;
  status: string;
  roomNumber: string;
  vitalSigns: {
    heartRate: number;
    bloodPressure: string;
    temperature: number;
    oxygenLevel: number;
  };
  lastUpdated: string;
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

// API Methods using fetch
const fetchPatientsFromAPI = async (status: string): Promise<Patient[]> => {
  try {
    const url = new URL(`${API_BASE_URL}/patients`);
    if (status !== 'all') {
      url.searchParams.append('status', status);
    }
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching patients by status:', error);
    throw error;
  }
};

const fetchRoomsFromAPI = async (status: string): Promise<Room[]> => {
  try {
    const url = new URL(`${API_BASE_URL}/rooms`);
    if (status !== 'all') {
      url.searchParams.append('status', status);
    }
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching room status:', error);
    throw error;
  }
};

const fetchAlertsFromAPI = async (priority: string): Promise<Alert[]> => {
  try {
    const url = new URL(`${API_BASE_URL}/alerts`);
    if (priority !== 'all') {
      url.searchParams.append('priority', priority);
    }
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching alerts:', error);
    throw error;
  }
};

// Mock implementations for development/testing
export const mockFetchPatientsByStatus = (status: string): Promise<Patient[]> => {
  return new Promise(resolve => {
    setTimeout(() => {
      const mockPatients: Patient[] = [
        {
          id: 'P1001',
          name: 'John Doe',
          status: 'critical',
          roomNumber: '101',
          vitalSigns: {
            heartRate: 125,
            bloodPressure: '160/95',
            temperature: 39.2,
            oxygenLevel: 88
          },
          lastUpdated: new Date().toISOString()
        },
        {
          id: 'P1045',
          name: 'Maria Garcia',
          status: 'critical',
          roomNumber: '205',
          vitalSigns: {
            heartRate: 115,
            bloodPressure: '145/90',
            temperature: 38.7,
            oxygenLevel: 91
          },
          lastUpdated: new Date().toISOString()
        },
        {
          id: 'P1078',
          name: 'Robert Chen',
          status: 'critical',
          roomNumber: '317',
          vitalSigns: {
            heartRate: 130,
            bloodPressure: '170/100',
            temperature: 38.5,
            oxygenLevel: 85
          },
          lastUpdated: new Date().toISOString()
        }
      ];
      resolve(mockPatients.filter(p => status === 'all' || p.status === status));
    }, 500);
  });
};

export const mockFetchRoomStatus = (status: string): Promise<Room[]> => {
  return new Promise(resolve => {
    setTimeout(() => {
      const mockRooms: Room[] = [
        {
          number: '101',
          status: 'occupied',
          patientId: 'P1001',
          patientName: 'John Doe',
          type: 'ICU',
          floor: 1,
          lastCleaned: '2025-07-27T10:00:00Z'
        },
        {
          number: '102',
          status: 'available',
          type: 'ICU',
          floor: 1,
          lastCleaned: '2025-07-28T08:30:00Z'
        },
        {
          number: '205',
          status: 'occupied',
          patientId: 'P1045',
          patientName: 'Maria Garcia',
          type: 'Regular',
          floor: 2,
          lastCleaned: '2025-07-27T15:45:00Z'
        },
        {
          number: '206',
          status: 'maintenance',
          type: 'Regular',
          floor: 2,
          lastCleaned: '2025-07-28T07:15:00Z'
        },
        {
          number: '317',
          status: 'occupied',
          patientId: 'P1078',
          patientName: 'Robert Chen',
          type: 'ICU',
          floor: 3,
          lastCleaned: '2025-07-27T16:20:00Z'
        }
      ];
      resolve(mockRooms.filter(r => status === 'all' || r.status === status));
    }, 500);
  });
};

export const mockFetchAlerts = (priority: string): Promise<Alert[]> => {
  return new Promise(resolve => {
    setTimeout(() => {
      const mockAlerts: Alert[] = [
        {
          id: 'A2001',
          roomNumber: '101',
          priority: 'high',
          message: 'Patient heart rate critically high',
          timestamp: '2025-07-28T09:15:30Z',
          acknowledged: false,
          patientId: 'P1001',
          patientName: 'John Doe',
          deviceId: 'HR-MONITOR-101'
        },
        {
          id: 'A2002',
          roomNumber: '205',
          priority: 'medium',
          message: 'IV bag needs replacement',
          timestamp: '2025-07-28T09:00:12Z',
          acknowledged: true,
          patientId: 'P1045',
          patientName: 'Maria Garcia',
          deviceId: 'IV-SYSTEM-205'
        },
        {
          id: 'A2003',
          roomNumber: '317',
          priority: 'high',
          message: 'Oxygen level below threshold',
          timestamp: '2025-07-28T09:22:45Z',
          acknowledged: false,
          patientId: 'P1078',
          patientName: 'Robert Chen',
          deviceId: 'O2-MONITOR-317'
        },
        {
          id: 'A2004',
          roomNumber: '102',
          priority: 'low',
          message: 'Room temperature above normal',
          timestamp: '2025-07-28T08:45:20Z',
          acknowledged: false,
          deviceId: 'THERMO-102'
        }
      ];
      
      if (priority === 'all') {
        resolve(mockAlerts);
      } else {
        resolve(mockAlerts.filter(a => a.priority === priority));
      }
    }, 500);
  });
};

// Configuration for development vs production
const USE_MOCK_DATA = true; // Set to false when backend API is available


// Export the appropriate functions based on environment
// export const fetchPatientsByStatus = USE_MOCK_DATA ? mockFetchPatientsByStatus : fetchPatientsFromAPI;
export const fetchPatientsByStatus = fetchPatientsFromAPI;
export const fetchRoomStatus = fetchRoomsFromAPI;
export const fetchAlerts = fetchAlertsFromAPI;