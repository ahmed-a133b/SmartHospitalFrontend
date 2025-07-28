import { useState } from 'react';
import { API_BASE_URL } from '../config';

export interface Room {
  roomId: string;
  roomType: 'ICU' | 'ER' | 'surgery' | 'isolation' | 'general';
  floor: number;
  capacity: number;
  assignedPatient?: string;
  assignedDevices: string[];
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResult<T> {
  success: boolean;
  data?: T;
  errors?: any;
}

export const useRooms = () => {
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/rooms`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch rooms`);
      }
      const data = await response.json();
      setRooms(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch rooms';
      setError(errorMessage);
      console.error('Error fetching rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRoom = async (roomId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch room`);
      }
      return await response.json();
    } catch (err) {
      console.error('Error fetching room:', err);
      throw err;
    }
  };

  const createRoom = async (roomData: Room): Promise<ApiResult<{ roomId: string }>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(roomData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        return {
          success: false,
          errors: {
            message: errorData?.detail || `HTTP ${response.status}: Failed to create room`
          }
        };
      }

      const result = await response.json();
      return {
        success: true,
        data: { roomId: result.roomId }
      };
    } catch (err) {
      return {
        success: false,
        errors: {
          message: err instanceof Error ? err.message : 'Failed to create room'
        }
      };
    }
  };

  const updateRoom = async (roomId: string, roomData: Room): Promise<ApiResult<void>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(roomData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        return {
          success: false,
          errors: {
            message: errorData?.detail || `HTTP ${response.status}: Failed to update room`
          }
        };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        errors: {
          message: err instanceof Error ? err.message : 'Failed to update room'
        }
      };
    }
  };

  const deleteRoom = async (roomId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        console.error(`Failed to delete room: HTTP ${response.status}`);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error deleting room:', err);
      return false;
    }
  };

  const assignPatientToRoom = async (roomId: string, patientId: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/rooms/${roomId}/assign-patient/${patientId}`,
        { method: 'POST' }
      );
      return response.ok;
    } catch (err) {
      console.error('Error assigning patient to room:', err);
      return false;
    }
  };

  const assignDeviceToRoom = async (roomId: string, deviceId: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/rooms/${roomId}/assign-device/${deviceId}`,
        { method: 'POST' }
      );
      return response.ok;
    } catch (err) {
      console.error('Error assigning device to room:', err);
      return false;
    }
  };

  const unassignPatientFromRoom = async (patientId: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/rooms/unassign-patient/${patientId}`,
        { method: 'DELETE' }
      );
      return response.ok;
    } catch (err) {
      console.error('Error unassigning patient from room:', err);
      return false;
    }
  };

  const unassignDeviceFromRoom = async (deviceId: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/rooms/unassign-device/${deviceId}`,
        { method: 'DELETE' }
      );
      return response.ok;
    } catch (err) {
      console.error('Error unassigning device from room:', err);
      return false;
    }
  };

  const getRoomOccupancyStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/stats/occupancy`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch occupancy stats`);
      }
      return await response.json();
    } catch (err) {
      console.error('Error fetching occupancy stats:', err);
      throw err;
    }
  };

  return {
    rooms,
    loading,
    error,
    getRooms,
    getRoom,
    createRoom,
    updateRoom,
    deleteRoom,
    assignPatientToRoom,
    assignDeviceToRoom,
    unassignPatientFromRoom,
    unassignDeviceFromRoom,
    getRoomOccupancyStats
  };
};
