import { useState, useCallback } from 'react';
import Api from '../api';
import { ENDPOINTS } from '../config';
import { IoTDevice } from '../types';

interface UseIoTResult {
    devices: Record<string, IoTDevice>;
    loading: boolean;
    error: string | null;
    getDevices: () => Promise<void>;
    getDevice: (deviceId: string) => Promise<IoTDevice | null>;
    getDeviceVitals: (deviceId: string) => Promise<IoTDevice['vitals']>;
    getDeviceAlerts: (deviceId: string, includeResolved?: boolean) => Promise<IoTDevice['alerts']>;
}

export function useIoT(): UseIoTResult {
    const [devices, setDevices] = useState<Record<string, IoTDevice>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getDevices = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await Api.get<Record<string, IoTDevice>>(ENDPOINTS.iot.getAll);
            
            if (response.error) {
                throw new Error(response.error);
            }

            if (response.data) {
                // Ensure each device has vitals and alerts initialized
                const initializedDevices = Object.entries(response.data).reduce<Record<string, IoTDevice>>((acc, [id, device]) => {
                    acc[id] = {
                        ...device,
                        vitals: device.vitals || {},
                        alerts: device.alerts || {}
                    };
                    return acc;
                }, {});
                setDevices(initializedDevices);
            } else {
                setDevices({});
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch IoT devices');
            setDevices({});
        } finally {
            setLoading(false);
        }
    }, []);

    const getDevice = useCallback(async (deviceId: string): Promise<IoTDevice | null> => {
        try {
            const response = await Api.get<IoTDevice>(ENDPOINTS.iot.getById(deviceId));
            if (response.error) {
                throw new Error(response.error);
            }
            if (response.data) {
                return {
                    ...response.data,
                    vitals: response.data.vitals || {},
                    alerts: response.data.alerts || {}
                };
            }
            return null;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch device');
            return null;
        }
    }, []);

    const getDeviceVitals = useCallback(async (deviceId: string): Promise<IoTDevice['vitals']> => {
        try {
            const response = await Api.get<IoTDevice['vitals']>(ENDPOINTS.iot.vitals(deviceId));
            if (response.error) {
                throw new Error(response.error);
            }
            return response.data || {};
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch device vitals');
            return {};
        }
    }, []);

    const getDeviceAlerts = useCallback(async (
        deviceId: string,
        includeResolved = false
    ): Promise<IoTDevice['alerts']> => {
        try {
            const queryParams = new URLSearchParams();
            if (includeResolved) {
                queryParams.append('include_resolved', 'true');
            }

            const response = await Api.get<IoTDevice['alerts']>(
                `${ENDPOINTS.iot.alerts(deviceId)}?${queryParams.toString()}`
            );
            
            if (response.error) {
                throw new Error(response.error);
            }

            return response.data || {};
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch device alerts');
            return {};
        }
    }, []);

    return {
        devices,
        loading,
        error,
        getDevices,
        getDevice,
        getDeviceVitals,
        getDeviceAlerts,
    };
} 