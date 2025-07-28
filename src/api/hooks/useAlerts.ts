import { useState, useCallback } from 'react';
import Api from '../api';
import { ENDPOINTS } from '../config';
import { Alert } from './useIoT';

interface Prediction {
    riskLevel: string;
    riskScore: number;
    confidence: number;
    predictedAt: string;
    nextPrediction: string;
    factors: string[];
    patientId: string;
    modelId: string;
    modelVersion: string;
}

interface UseAlertsAndPredictionsResult {
    alerts: Alert[];
    predictions: Prediction[];
    loading: boolean;
    error: string | null;
    getAlerts: (type?: 'critical' | 'warning' | 'info') => Promise<void>;
    getPatientAlerts: (patientId: string) => Promise<Alert[]>;
    getDeviceAlerts: (deviceId: string) => Promise<Alert[]>;
    getPredictions: () => Promise<void>;
    getPatientPredictions: (patientId: string) => Promise<Prediction[]>;
    getLatestPrediction: (patientId: string) => Promise<Prediction | null>;
}

export function useAlertsAndPredictions(): UseAlertsAndPredictionsResult {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getAlerts = useCallback(async (type?: 'critical' | 'warning' | 'info') => {
        try {
            setLoading(true);
            setError(null);
            
            const queryParams = new URLSearchParams();
            if (type) queryParams.append('type', type);

            const response = await Api.get<Alert[]>(
                `${ENDPOINTS.alerts.getAll}?${queryParams.toString()}`
            );
            
            if (response.error) {
                throw new Error(response.error);
            }

            if (response.data) {
                setAlerts(response.data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
        } finally {
            setLoading(false);
        }
    }, []);

    const getPatientAlerts = useCallback(async (patientId: string): Promise<Alert[]> => {
        try {
            const response = await Api.get<Alert[]>(ENDPOINTS.alerts.forPatient(patientId));
            if (response.error) {
                throw new Error(response.error);
            }
            return response.data || [];
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch patient alerts');
            return [];
        }
    }, []);

    const getDeviceAlerts = useCallback(async (deviceId: string): Promise<Alert[]> => {
        try {
            const response = await Api.get<Alert[]>(ENDPOINTS.alerts.forDevice(deviceId));
            if (response.error) {
                throw new Error(response.error);
            }
            return response.data || [];
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch device alerts');
            return [];
        }
    }, []);

    const getPredictions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await Api.get<Prediction[]>(ENDPOINTS.predictions.getAll);
            
            if (response.error) {
                throw new Error(response.error);
            }

            if (response.data) {
                setPredictions(response.data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch predictions');
        } finally {
            setLoading(false);
        }
    }, []);

    const getPatientPredictions = useCallback(async (patientId: string): Promise<Prediction[]> => {
        try {
            const response = await Api.get<Prediction[]>(ENDPOINTS.predictions.forPatient(patientId));
            if (response.error) {
                throw new Error(response.error);
            }
            return response.data || [];
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch patient predictions');
            return [];
        }
    }, []);

    const getLatestPrediction = useCallback(async (patientId: string): Promise<Prediction | null> => {
        try {
            const predictions = await getPatientPredictions(patientId);
            if (predictions.length === 0) {
                return null;
            }
            
            // Sort by predictedAt timestamp and return the most recent
            return predictions.sort((a, b) => 
                new Date(b.predictedAt).getTime() - new Date(a.predictedAt).getTime()
            )[0];
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch latest prediction');
            return null;
        }
    }, [getPatientPredictions]);

    return {
        alerts,
        predictions,
        loading,
        error,
        getAlerts,
        getPatientAlerts,
        getDeviceAlerts,
        getPredictions,
        getPatientPredictions,
        getLatestPrediction,
    };
} 