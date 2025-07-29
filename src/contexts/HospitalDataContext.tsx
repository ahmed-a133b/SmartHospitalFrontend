import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { usePatients } from '../api/hooks/usePatients';
import { useIoT } from '../api/hooks/useIoT';
import { useStaff } from '../api/hooks/useStaff';
import { useAlertsAndPredictions } from '../api/hooks/useAlerts';
import { useRooms, Room } from '../api/hooks/useRooms';
import { Patient, StaffMember, IoTDevice } from '../api/types';

interface ValidationErrors {
  [key: string]: string[];
}

interface ApiError {
  message: string;
  validationErrors?: ValidationErrors;
}

interface ApiResult<T> {
  success: boolean;
  data?: T;
  errors?: ApiError;
}

interface HospitalDataContextType {
  patients: Record<string, Patient>;
  staff: Record<string, StaffMember>;
  iotDevices: Record<string, IoTDevice>;
  rooms: Record<string, Room>;
  loading: boolean;
  error: string | null;
  addPatient: (patient: Patient) => Promise<ApiResult<{ patientId: string }>>;
  updatePatient: (id: string, patient: Patient) => Promise<ApiResult<void>>;
  deletePatient: (id: string) => Promise<boolean>;
  addRoom: (room: Room) => Promise<ApiResult<{ roomId: string }>>;
  updateRoom: (id: string, room: Room) => Promise<ApiResult<void>>;
  deleteRoom: (id: string) => Promise<boolean>;
  getCriticalPatients: () => Patient[];
  getActiveAlerts: () => Array<{ deviceId: string; alertId: string; alert: IoTDevice['alerts'][string] }>;
  refreshData: () => Promise<void>;
  refreshAlertsOnly: () => Promise<void>;
}

const HospitalDataContext = createContext<HospitalDataContextType | undefined>(undefined);

export const useHospitalData = () => {
  const context = useContext(HospitalDataContext);
  if (context === undefined) {
    throw new Error('useHospitalData must be used within a HospitalDataProvider');
  }
  return context;
};

export const HospitalDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const {
    patients,
    loading: patientsLoading,
    error: patientsError,
    getPatients,
    createPatient,
    updatePatient: updatePatientApi,
    deletePatient: deletePatientApi,
  } = usePatients();

  const {
    devices: iotDevices,
    loading: devicesLoading,
    error: devicesError,
    getDevices,
  } = useIoT();

  const {
    staff,
    loading: staffLoading,
    error: staffError,
    getStaffMembers,
  } = useStaff();

  const {
    // alerts, // Removed since not used directly
    loading: alertsLoading,
    error: alertsError,
    getAlerts,
  } = useAlertsAndPredictions();

  const {
    rooms,
    loading: roomsLoading,
    error: roomsError,
    getRooms,
    createRoom,
    updateRoom: updateRoomApi,
    deleteRoom: deleteRoomApi,
  } = useRooms();

  const loading = patientsLoading || devicesLoading || staffLoading || alertsLoading || roomsLoading;
  const error = patientsError || devicesError || staffError || alertsError || roomsError;

  useEffect(() => {
    refreshData();
  }, []);

  // Set up periodic refresh for alerts only every 60 seconds (reduced frequency)
  useEffect(() => {
    const alertRefreshInterval = setInterval(() => {
      console.log('🔄 HospitalDataContext: Refreshing alerts data only...');
      // Only refresh IoT devices which includes alerts, not all data
      getDevices();
    }, 60000); // 60 seconds (reduced from 30 seconds)

    return () => clearInterval(alertRefreshInterval);
  }, [getDevices]);

  // Check for critical alerts every 30 seconds but only refresh if needed (reduced frequency)
  useEffect(() => {
    const criticalAlertRefreshInterval = setInterval(() => {
      const activeAlerts = Object.entries(iotDevices).flatMap(([deviceId, device]) => {
        return Object.entries(device.alerts || {})
          .filter(([_, alert]) => !alert.resolved && alert.type === 'critical')
          .map(([alertId, alert]) => ({ deviceId, alertId, alert }));
      });

      if (activeAlerts.length > 0) {
        console.log('⚠️ HospitalDataContext: Critical alerts detected, refreshing devices only...');
        // Only refresh devices, not all data
        getDevices();
      }
    }, 30000); // 30 seconds (reduced from 10 seconds)

    return () => clearInterval(criticalAlertRefreshInterval);
  }, [iotDevices, getDevices]);

  const refreshData = async () => {
    await Promise.all([
      getPatients(),
      getDevices(),
      getStaffMembers(),
      getAlerts(),
      getRooms(),
    ]);
  };

  // Add a separate function to refresh only alert-related data
  const refreshAlertsOnly = async () => {
    console.log('🔄 HospitalDataContext: Refreshing alerts only...');
    await getDevices(); // IoT devices contain the alerts
  };

  const addPatient = async (patient: Patient) => {
    const result = await createPatient(patient);
    if (result.success) {
      await refreshData();
    }
    return result;
  };

  const updatePatient = async (id: string, patient: Patient) => {
    const result = await updatePatientApi(id, patient);
    if (result.success) {
      await refreshData();
    }
    return result;
  };

  const deletePatient = async (id: string) => {
    const success = await deletePatientApi(id);
    if (success) {
      await refreshData();
    }
    return success;
  };

  const addRoom = async (room: Room) => {
    const result = await createRoom(room);
    if (result.success) {
      await refreshData();
    }
    return result;
  };

  const updateRoom = async (id: string, room: Room) => {
    const result = await updateRoomApi(id, room);
    if (result.success) {
      await refreshData();
    }
    return result;
  };

  const deleteRoom = async (id: string) => {
    const success = await deleteRoomApi(id);
    if (success) {
      await refreshData();
    }
    return success;
  };

  const getCriticalPatients = () => {
    return Object.values(patients).filter(
      patient => patient.currentStatus.status === 'critical'
    );
  };

  const getActiveAlerts = () => {
    return Object.entries(iotDevices).flatMap(([deviceId, device]) => {
      return Object.entries(device.alerts || {})
        .filter(([_, alert]) => !alert.resolved)
        .map(([alertId, alert]) => ({ deviceId, alertId, alert }));
    });
  };

  const value = {
    patients,
    staff,
    iotDevices: iotDevices || {},
    rooms: rooms || {},
    loading,
    error,
    addPatient,
    updatePatient,
    deletePatient,
    addRoom,
    updateRoom,
    deleteRoom,
    getCriticalPatients,
    getActiveAlerts,
    refreshData,
    refreshAlertsOnly,
  };

  return (
    <HospitalDataContext.Provider value={value}>
      {children}
    </HospitalDataContext.Provider>
  );
};