import Api from './api';

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

export interface StaffStatistics {
    total_staff: number;
    on_duty_count: number;
    by_role: Record<string, number>;
    by_department: Record<string, number>;
    average_workload: number;
    shift_distribution: Record<string, number>;
}

export interface WorkloadHistory {
    staff_id: string;
    history: Array<{
        date: string;
        workload: number;
        hours_worked: number;
    }>;
    average_workload: number;
}

export interface Department {
    name: string;
    total_staff: number;
    on_duty: number;
    roles: Record<string, number>;
}

export class StaffService {
    private static baseUrl = '/staff';

    // Basic CRUD operations
    static async getAllStaff(filters?: {
        role?: string;
        department?: string;
        onDuty?: boolean;
    }) {
        const queryParams = new URLSearchParams();
        if (filters?.role) queryParams.append('role', filters.role);
        if (filters?.department) queryParams.append('department', filters.department);
        if (filters?.onDuty !== undefined) queryParams.append('onDuty', filters.onDuty.toString());

        const url = queryParams.toString() 
            ? `${this.baseUrl}/?${queryParams.toString()}`
            : `${this.baseUrl}/`;
        
        console.log('🌐 Staff API URL:', url);
        console.log('🔍 Filters:', filters);
        
        return Api.get<Record<string, StaffMember>>(url);
    }

    static async getStaffById(staffId: string) {
        return Api.get<StaffMember>(`${this.baseUrl}/${staffId}`);
    }

    static async createStaff(staffData: StaffMember) {
        return Api.post<{ id: string; data: StaffMember }>(`${this.baseUrl}/`, staffData);
    }

    static async updateStaff(staffId: string, staffData: Partial<StaffMember>) {
        return Api.put<{ message: string }>(`${this.baseUrl}/${staffId}`, staffData);
    }

    static async deleteStaff(staffId: string) {
        return Api.delete<{ message: string }>(`${this.baseUrl}/${staffId}`);
    }

    // Schedule management
    static async getStaffSchedule(
        staffId: string,
        startDate: string,
        endDate?: string
    ) {
        const queryParams = new URLSearchParams();
        queryParams.append('start_date', startDate);
        if (endDate) queryParams.append('end_date', endDate);

        return Api.get<Record<string, any>>(
            `${this.baseUrl}/${staffId}/schedule?${queryParams.toString()}`
        );
    }

    static async updateStaffSchedule(
        staffId: string,
        date: string,
        shift: any
    ) {
        return Api.put<{ message: string }>(
            `${this.baseUrl}/${staffId}/schedule/${date}`,
            shift
        );
    }

    static async updateBulkSchedule(
        staffId: string,
        scheduleData: Record<string, any>
    ) {
        return Api.post<{
            message: string;
            staff_id: string;
            updated_dates: string[];
        }>(`${this.baseUrl}/${staffId}/schedule/bulk`, scheduleData);
    }

    // Status management
    static async updateStaffStatus(staffId: string, status: any) {
        return Api.put<{ message: string }>(`${this.baseUrl}/${staffId}/status`, status);
    }

    static async toggleDutyStatus(staffId: string, onDuty: boolean) {
        return Api.put<{
            message: string;
            staff_id: string;
            on_duty: boolean;
        }>(`${this.baseUrl}/${staffId}/duty-status`, { on_duty: onDuty });
    }

    // Advanced querying
    static async getStaffStatistics() {
        console.log('🌐 Statistics API URL:', `${this.baseUrl}/stats`);
        return Api.get<StaffStatistics>(`${this.baseUrl}/stats`);
    }

    static async getOnDutyStaff() {
        return Api.get<Record<string, StaffMember>>(`${this.baseUrl}/on-duty`);
    }

    static async getStaffByWard(wardId: string) {
        return Api.get<Record<string, StaffMember>>(`${this.baseUrl}/by-ward/${wardId}`);
    }

    static async getStaffPatients(staffId: string) {
        return Api.get<Record<string, any>>(`${this.baseUrl}/${staffId}/patients`);
    }

    static async getStaffLoad() {
        return Api.get<Record<string, number>>(`${this.baseUrl}/load`);
    }

    static async getWorkloadHistory(staffId: string, days: number = 7) {
        return Api.get<WorkloadHistory>(
            `${this.baseUrl}/${staffId}/workload-history?days=${days}`
        );
    }

    static async getDepartments() {
        return Api.get<Record<string, Department>>(`${this.baseUrl}/departments`);
    }

    static async searchStaff(query: string, limit: number = 20) {
        return Api.get<Record<string, StaffMember>>(
            `${this.baseUrl}/search?query=${encodeURIComponent(query)}&limit=${limit}`
        );
    }
}

export default StaffService;
