import { useState, useCallback } from 'react';
import Api from '../api';
import { ENDPOINTS } from '../config';
import { Patient } from '../types';

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

interface UsePatientResult {
  patients: Record<string, Patient>;
  loading: boolean;
  error: string | null;
  getPatients: (params?: { ward?: string; status?: string; riskLevel?: string }) => Promise<void>;
  getPatient: (id: string) => Promise<Patient | null>;
  createPatient: (patient: Patient) => Promise<ApiResult<{ patientId: string }>>;
  updatePatient: (id: string, patient: Patient) => Promise<ApiResult<void>>;
  deletePatient: (id: string) => Promise<boolean>;
  getPatientVitals: (id: string, params?: { startTime?: string; endTime?: string; limit?: number }) => Promise<any[]>;
  getPatientsByWard: (wardId: string, status?: string) => Promise<Record<string, Patient>>;
  getPatientsByRisk: (riskLevel: string, ward?: string) => Promise<Record<string, Patient>>;
}

export function usePatients(): UsePatientResult {
  const [patients, setPatients] = useState<Record<string, Patient>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPatients = useCallback(async (params?: { ward?: string; status?: string; riskLevel?: string }) => {
        try {
            setLoading(true);
            setError(null);
            
            const queryParams = new URLSearchParams();
            if (params?.ward) queryParams.append('ward', params.ward);
            if (params?.status) queryParams.append('status', params.status);
            if (params?.riskLevel) queryParams.append('risk_level', params.riskLevel);

            const response = await Api.get<Record<string, Patient>>(
                `${ENDPOINTS.patients.getAll}?${queryParams.toString()}`
            );
            
            if (response.error) {
                throw new Error(response.error);
            }

            if (response.data) {
                setPatients(response.data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch patients');
        } finally {
            setLoading(false);
        }
    }, []);

    const getPatient = useCallback(async (id: string): Promise<Patient | null> => {
        try {
            const response = await Api.get<Patient>(ENDPOINTS.patients.getById(id));
            if (response.error) {
                throw new Error(response.error);
            }
            return response.data || null;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch patient');
            return null;
        }
    }, []);

    const createPatient = useCallback(async (patient: Patient): Promise<ApiResult<{ patientId: string }>> => {
        try {
            const response = await Api.post<{ patient_id: string }>(ENDPOINTS.patients.create, patient);
            if (response.error || response.validationErrors) {
                return {
                    success: false,
                    errors: {
                        message: response.error || 'Failed to create patient',
                        validationErrors: response.validationErrors
                    }
                };
            }
            return {
                success: true,
                data: { patientId: response.data?.patient_id || '' }
            };
        } catch (err) {
            return {
                success: false,
                errors: {
                    message: err instanceof Error ? err.message : 'Failed to create patient'
                }
            };
        }
    }, []);

    const updatePatient = useCallback(async (id: string, patient: Patient): Promise<ApiResult<void>> => {
        try {
            const response = await Api.put(ENDPOINTS.patients.update(id), patient);
            if (response.error || response.validationErrors) {
                return {
                    success: false,
                    errors: {
                        message: response.error || 'Failed to update patient',
                        validationErrors: response.validationErrors
                    }
                };
            }
            return { success: true };
        } catch (err) {
            return {
                success: false,
                errors: {
                    message: err instanceof Error ? err.message : 'Failed to update patient'
                }
            };
        }
    }, []);

    const deletePatient = useCallback(async (id: string): Promise<boolean> => {
        try {
            const response = await Api.delete(ENDPOINTS.patients.delete(id));
            if (response.error) {
                throw new Error(response.error);
            }
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete patient');
            return false;
        }
    }, []);

    const getPatientVitals = useCallback(async (
        id: string,
        params?: { startTime?: string; endTime?: string; limit?: number }
    ): Promise<any[]> => {
        try {
            const queryParams = new URLSearchParams();
            if (params?.startTime) queryParams.append('start_time', params.startTime);
            if (params?.endTime) queryParams.append('end_time', params.endTime);
            if (params?.limit) queryParams.append('limit', params.limit.toString());

            const response = await Api.get<any[]>(
                `${ENDPOINTS.patients.vitals(id)}?${queryParams.toString()}`
            );
            
            if (response.error) {
                throw new Error(response.error);
            }

            return response.data || [];
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch patient vitals');
            return [];
        }
    }, []);

    const getPatientsByWard = useCallback(async (
        wardId: string,
        status?: string
    ): Promise<Record<string, Patient>> => {
        try {
            const queryParams = new URLSearchParams();
            if (status) queryParams.append('status', status);

            const response = await Api.get<Record<string, Patient>>(
                `${ENDPOINTS.patients.byWard(wardId)}?${queryParams.toString()}`
            );
            
            if (response.error) {
                throw new Error(response.error);
            }

            return response.data || {};
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch ward patients');
            return {};
        }
    }, []);

    const getPatientsByRisk = useCallback(async (
        riskLevel: string,
        ward?: string
    ): Promise<Record<string, Patient>> => {
        try {
            const queryParams = new URLSearchParams();
            if (ward) queryParams.append('ward', ward);

            const response = await Api.get<Record<string, Patient>>(
                `${ENDPOINTS.patients.byRisk(riskLevel)}?${queryParams.toString()}`
            );
            
            if (response.error) {
                throw new Error(response.error);
            }

            return response.data || {};
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch risk-level patients');
            return {};
        }
    }, []);

    return {
        patients,
        loading,
        error,
        getPatients,
        getPatient,
        createPatient,
        updatePatient,
        deletePatient,
        getPatientVitals,
        getPatientsByWard,
        getPatientsByRisk,
    };
} 