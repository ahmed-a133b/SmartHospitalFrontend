// API functions for patient-monitor assignment
import { API_BASE_URL } from './config';

export interface AssignPatientToMonitorRequest {
  patientId: string;
}

export interface PatientMonitorAssignmentResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Assign a patient to a monitor device
 */
export const assignPatientToMonitor = async (
  deviceId: string, 
  patientId: string
): Promise<PatientMonitorAssignmentResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/iotData/${deviceId}/assign-patient`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ patientId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: 'Failed to assign patient to monitor',
        error: errorData.detail || 'Unknown error occurred'
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || 'Patient assigned to monitor successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Network error occurred',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Unassign/detach patient from a monitor device
 */
export const unassignPatientFromMonitor = async (
  deviceId: string
): Promise<PatientMonitorAssignmentResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/iotData/${deviceId}/unassign-patient`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: 'Failed to unassign patient from monitor',
        error: errorData.detail || 'Unknown error occurred'
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || 'Patient unassigned from monitor successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Network error occurred',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Get available patients in the same room as the monitor
 */
export const getAvailablePatientsForMonitor = async (deviceId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/iotData/${deviceId}/available-patients`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch available patients');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching available patients:', error);
    throw error;
  }
};
