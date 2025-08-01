import { useState, useCallback } from 'react';
import StaffService, { StaffMember, StaffStatistics, WorkloadHistory, Department } from '../staffService';

interface UseStaffResult {
    staff: Record<string, StaffMember>;
    loading: boolean;
    error: string | null;
    statistics: StaffStatistics | null;
    
    // Basic CRUD operations
    getStaffMembers: (filters?: { role?: string; department?: string; onDuty?: boolean }) => Promise<void>;
    getStaffMember: (id: string) => Promise<StaffMember | null>;
    createStaff: (staffData: StaffMember) => Promise<{ id: string; data: StaffMember } | null>;
    updateStaff: (id: string, staffData: Partial<StaffMember>) => Promise<boolean>;
    deleteStaff: (id: string) => Promise<boolean>;
    
    // Schedule management
    getStaffSchedule: (id: string, startDate: string, endDate?: string) => Promise<Record<string, any>>;
    updateStaffSchedule: (id: string, date: string, shift: any) => Promise<boolean>;
    updateBulkSchedule: (id: string, scheduleData: Record<string, any>) => Promise<boolean>;
    
    // Status management
    updateStaffStatus: (id: string, status: any) => Promise<boolean>;
    toggleDutyStatus: (id: string, onDuty: boolean) => Promise<boolean>;
    
    // Advanced querying
    getStaffStatistics: () => Promise<void>;
    getOnDutyStaff: () => Promise<Record<string, StaffMember>>;
    getStaffByWard: (wardId: string) => Promise<Record<string, StaffMember>>;
    getStaffPatients: (id: string) => Promise<Record<string, any>>;
    getStaffLoad: () => Promise<Record<string, number>>;
    getWorkloadHistory: (id: string, days?: number) => Promise<WorkloadHistory | null>;
    getDepartments: () => Promise<Record<string, Department>>;
    searchStaff: (query: string, limit?: number) => Promise<Record<string, StaffMember>>;
}

export function useStaff(): UseStaffResult {
    const [staff, setStaff] = useState<Record<string, StaffMember>>({});
    const [statistics, setStatistics] = useState<StaffStatistics | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Basic CRUD operations
    const getStaffMembers = useCallback(async (filters?: { 
        role?: string; 
        department?: string; 
        onDuty?: boolean 
    }) => {
        try {
            setLoading(true);
            setError(null);
            
            console.log('🔄 Fetching staff members with filters:', filters);
            const response = await StaffService.getAllStaff(filters);
            console.log('📡 Staff API Response:', response);
            
            if (response.error) {
                console.error('❌ Staff API Error:', response.error);
                throw new Error(response.error);
            }

            if (response.data) {
                console.log('✅ Staff data received:', Object.keys(response.data).length, 'members');
                setStaff(response.data);
            } else {
                console.warn('⚠️ No staff data in response');
                setStaff({});
            }
        } catch (err) {
            console.error('💥 Error in getStaffMembers:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch staff members');
        } finally {
            setLoading(false);
        }
    }, []);

    const getStaffMember = useCallback(async (id: string): Promise<StaffMember | null> => {
        try {
            const response = await StaffService.getStaffById(id);
            if (response.error) {
                throw new Error(response.error);
            }
            return response.data || null;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch staff member');
            return null;
        }
    }, []);

    const createStaff = useCallback(async (staffData: StaffMember) => {
        try {
            setLoading(true);
            const response = await StaffService.createStaff(staffData);
            if (response.error) {
                throw new Error(response.error);
            }
            
            // Refresh staff list after creation
            await getStaffMembers();
            return response.data || null;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create staff member');
            return null;
        } finally {
            setLoading(false);
        }
    }, [getStaffMembers]);

    const updateStaff = useCallback(async (id: string, staffData: Partial<StaffMember>): Promise<boolean> => {
        try {
            setLoading(true);
            const response = await StaffService.updateStaff(id, staffData);
            if (response.error) {
                throw new Error(response.error);
            }
            
            // Refresh staff list after update
            await getStaffMembers();
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update staff member');
            return false;
        } finally {
            setLoading(false);
        }
    }, [getStaffMembers]);

    const deleteStaff = useCallback(async (id: string): Promise<boolean> => {
        try {
            setLoading(true);
            const response = await StaffService.deleteStaff(id);
            if (response.error) {
                throw new Error(response.error);
            }
            
            // Refresh staff list after deletion
            await getStaffMembers();
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete staff member');
            return false;
        } finally {
            setLoading(false);
        }
    }, [getStaffMembers]);

    // Schedule management
    const getStaffSchedule = useCallback(async (
        id: string,
        startDate: string,
        endDate?: string
    ): Promise<Record<string, any>> => {
        try {
            const response = await StaffService.getStaffSchedule(id, startDate, endDate);
            
            if (response.error) {
                throw new Error(response.error);
            }

            return response.data || {};
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch staff schedule');
            return {};
        }
    }, []);

    const updateStaffSchedule = useCallback(async (
        id: string,
        date: string,
        shift: any
    ): Promise<boolean> => {
        try {
            const response = await StaffService.updateStaffSchedule(id, date, shift);
            if (response.error) {
                throw new Error(response.error);
            }
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update staff schedule');
            return false;
        }
    }, []);

    const updateBulkSchedule = useCallback(async (
        id: string,
        scheduleData: Record<string, any>
    ): Promise<boolean> => {
        try {
            const response = await StaffService.updateBulkSchedule(id, scheduleData);
            if (response.error) {
                throw new Error(response.error);
            }
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update bulk schedule');
            return false;
        }
    }, []);

    // Status management
    const updateStaffStatus = useCallback(async (id: string, status: any): Promise<boolean> => {
        try {
            const response = await StaffService.updateStaffStatus(id, status);
            if (response.error) {
                throw new Error(response.error);
            }
            
            // Refresh staff data to reflect status change
            await getStaffMembers();
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update staff status');
            return false;
        }
    }, [getStaffMembers]);

    const toggleDutyStatus = useCallback(async (id: string, onDuty: boolean): Promise<boolean> => {
        try {
            const response = await StaffService.toggleDutyStatus(id, onDuty);
            if (response.error) {
                throw new Error(response.error);
            }
            
            // Refresh staff data to reflect duty status change
            await getStaffMembers();
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to toggle duty status');
            return false;
        }
    }, [getStaffMembers]);

    // Advanced querying
    const getStaffStatistics = useCallback(async () => {
        try {
            console.log('🔄 Fetching staff statistics...');
            const response = await StaffService.getStaffStatistics();
            console.log('📊 Statistics API Response:', response);
            
            if (response.error) {
                console.error('❌ Statistics API Error:', response.error);
                throw new Error(response.error);
            }
            if (response.data) {
                console.log('✅ Statistics data received:', response.data);
                setStatistics(response.data);
            } else {
                console.warn('⚠️ No statistics data in response');
            }
        } catch (err) {
            console.error('💥 Error in getStaffStatistics:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch staff statistics');
        }
    }, []);

    const getOnDutyStaff = useCallback(async (): Promise<Record<string, StaffMember>> => {
        try {
            const response = await StaffService.getOnDutyStaff();
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
            const response = await StaffService.getStaffByWard(wardId);
            if (response.error) {
                throw new Error(response.error);
            }
            return response.data || {};
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch ward staff');
            return {};
        }
    }, []);

    const getStaffPatients = useCallback(async (id: string): Promise<Record<string, any>> => {
        try {
            const response = await StaffService.getStaffPatients(id);
            if (response.error) {
                throw new Error(response.error);
            }
            return response.data || {};
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch staff patients');
            return {};
        }
    }, []);

    const getStaffLoad = useCallback(async (): Promise<Record<string, number>> => {
        try {
            const response = await StaffService.getStaffLoad();
            if (response.error) {
                throw new Error(response.error);
            }
            return response.data || {};
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch staff load');
            return {};
        }
    }, []);

    const getWorkloadHistory = useCallback(async (
        id: string,
        days: number = 7
    ): Promise<WorkloadHistory | null> => {
        try {
            const response = await StaffService.getWorkloadHistory(id, days);
            if (response.error) {
                throw new Error(response.error);
            }
            return response.data || null;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch workload history');
            return null;
        }
    }, []);

    const getDepartments = useCallback(async (): Promise<Record<string, Department>> => {
        try {
            const response = await StaffService.getDepartments();
            if (response.error) {
                throw new Error(response.error);
            }
            return response.data || {};
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch departments');
            return {};
        }
    }, []);

    const searchStaff = useCallback(async (
        query: string,
        limit: number = 20
    ): Promise<Record<string, StaffMember>> => {
        try {
            const response = await StaffService.searchStaff(query, limit);
            if (response.error) {
                throw new Error(response.error);
            }
            return response.data || {};
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to search staff');
            return {};
        }
    }, []);

    return {
        staff,
        statistics,
        loading,
        error,
        getStaffMembers,
        getStaffMember,
        createStaff,
        updateStaff,
        deleteStaff,
        getStaffSchedule,
        updateStaffSchedule,
        updateBulkSchedule,
        updateStaffStatus,
        toggleDutyStatus,
        getStaffStatistics,
        getOnDutyStaff,
        getStaffByWard,
        getStaffPatients,
        getStaffLoad,
        getWorkloadHistory,
        getDepartments,
        searchStaff,
    };
} 