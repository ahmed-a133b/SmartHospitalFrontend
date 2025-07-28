import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export interface Bed {
  roomId: string;
  bedNumber: string;
  type: string;
  status: string;
  patientId?: string;
  features: string[];
  lastCleaned?: string;
  position?: {
    x: number;
    y: number;
    rotation: number;
  };
}

export const useBeds = () => {
  const [beds, setBeds] = useState<Record<string, Bed>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBeds = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/beds/`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setBeds(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch beds');
      console.error('Error fetching beds:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRoomBeds = async (roomId: string): Promise<Record<string, Bed>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/beds/room/${roomId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (err) {
      console.error('Error fetching room beds:', err);
      return {};
    }
  };

  const getAvailableBedsInRoom = async (roomId: string): Promise<Record<string, Bed>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/beds/room/${roomId}/available`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (err) {
      console.error('Error fetching available beds:', err);
      return {};
    }
  };

  const assignPatientToBed = async (bedId: string, patientId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/beds/${bedId}/assign-patient/${patientId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      await fetchBeds(); // Refresh beds data
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign patient to bed';
      console.error('Error assigning patient to bed:', err);
      return { success: false, error: errorMessage };
    }
  };

  const dischargePatientFromBed = async (bedId: string, patientId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/beds/${bedId}/discharge-patient/${patientId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      await fetchBeds(); // Refresh beds data
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to discharge patient from bed';
      console.error('Error discharging patient from bed:', err);
      return { success: false, error: errorMessage };
    }
  };

  const getPatientBed = async (patientId: string): Promise<{ bed_id?: string; bed_data?: Bed } | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/beds/patient/${patientId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.bed ? data : null;
    } catch (err) {
      console.error('Error fetching patient bed:', err);
      return null;
    }
  };

  const getBedOccupancyStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/beds/stats/occupancy`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (err) {
      console.error('Error fetching bed occupancy stats:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchBeds();
  }, []);

  return {
    beds,
    loading,
    error,
    fetchBeds,
    getRoomBeds,
    getAvailableBedsInRoom,
    assignPatientToBed,
    dischargePatientFromBed,
    getPatientBed,
    getBedOccupancyStats,
  };
};
