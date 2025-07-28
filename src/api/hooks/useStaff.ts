import { useState, useCallback } from 'react';
import Api from '../api';
import { ENDPOINTS } from '../config';

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
        lastBreak: string;
    };
    performance: {
        tasksCompleted: number;
        averageResponseTime: number;
        patientSatisfaction: number;
    };
}

interface UseStaffResult {
    staff: Record<string, StaffMember>;
    loading: boolean;
    error: string | null;
    getStaffMembers: (department?: string, role?: string) => Promise<void>;
    getStaffMember: (id: string) => Promise<StaffMember | null>;
    getStaffSchedule: (id: string, date?: string) => Promise<Record<string, any>>;
    getOnDutyStaff: () => Promise<Record<string, StaffMember>>;
    getStaffByWard: (wardId: string) => Promise<Record<string, StaffMember>>;
}

export function useStaff(): UseStaffResult {
    const [staff, setStaff] = useState<Record<string, StaffMember>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getStaffMembers = useCallback(async (department?: string, role?: string) => {
        try {
            setLoading(true);
            setError(null);
            
            const queryParams = new URLSearchParams();
            if (department) queryParams.append('department', department);
            if (role) queryParams.append('role', role);

            const response = await Api.get<Record<string, StaffMember>>(
                `${ENDPOINTS.staff.getAll}?${queryParams.toString()}`
            );
            
            if (response.error) {
                throw new Error(response.error);
            }

            if (response.data) {
                setStaff(response.data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch staff members');
        } finally {
            setLoading(false);
        }
    }, []);

    const getStaffMember = useCallback(async (id: string): Promise<StaffMember | null> => {
        try {
            const response = await Api.get<StaffMember>(ENDPOINTS.staff.getById(id));
            if (response.error) {
                throw new Error(response.error);
            }
            return response.data || null;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch staff member');
            return null;
        }
    }, []);

    const getStaffSchedule = useCallback(async (
        id: string,
        date?: string
    ): Promise<Record<string, any>> => {
        try {
            const queryParams = new URLSearchParams();
            if (date) queryParams.append('date', date);

            const response = await Api.get<Record<string, any>>(
                `${ENDPOINTS.staff.schedule(id)}?${queryParams.toString()}`
            );
            
            if (response.error) {
                throw new Error(response.error);
            }

            return response.data || {};
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch staff schedule');
            return {};
        }
    }, []);

    const getOnDutyStaff = useCallback(async (): Promise<Record<string, StaffMember>> => {
        try {
            const response = await Api.get<Record<string, StaffMember>>(
                `${ENDPOINTS.staff.getAll}?on_duty=true`
            );
            
            if (response.error) {
                throw new Error(response.error);
            }

            return response.data || {};
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch on-duty staff');
            return {};
        }
    }, []);

    const getStaffByWard = useCallback(async (
        wardId: string
    ): Promise<Record<string, StaffMember>> => {
        try {
            const response = await Api.get<Record<string, StaffMember>>(
                `${ENDPOINTS.staff.getAll}?ward=${wardId}`
            );
            
            if (response.error) {
                throw new Error(response.error);
            }

            return response.data || {};
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch ward staff');
            return {};
        }
    }, []);

    return {
        staff,
        loading,
        error,
        getStaffMembers,
        getStaffMember,
        getStaffSchedule,
        getOnDutyStaff,
        getStaffByWard,
    };
} 