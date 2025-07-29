import React, { useState, useEffect } from 'react';
import { useHospitalData } from '../../../../contexts/HospitalDataContext';
import { useBeds, Bed } from '../../../../api/hooks/useBeds';
import { X, Save, Bed as BedIcon, Monitor, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { API_BASE_URL } from '../../../../api/config';

interface RoomFormProps {
  roomId?: string;
  onClose: () => void;
}

interface RoomData {
  roomId: string;
  roomType: 'ICU' | 'ER' | 'surgery' | 'isolation' | 'general';
  floor: number;
  capacity: number;
  assignedDevices: string[];
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  description?: string;
}

const RoomForm: React.FC<RoomFormProps> = ({ roomId, onClose }) => {
  const { patients, iotDevices, addRoom, updateRoom, refreshAlertsOnly } = useHospitalData();
  const { getRoomBeds, assignPatientToBed, dischargePatientFromBed } = useBeds();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomBeds, setRoomBeds] = useState<Record<string, Bed>>({});
  const [assignmentLoading, setAssignmentLoading] = useState<Record<string, boolean>>({});
  const [confirmAction, setConfirmAction] = useState<{
    type: 'discharge_patient' | null;
    bedId?: string;
    patientId?: string;
  }>({ type: null });
  
  const [formData, setFormData] = useState<RoomData>({
    roomId: '',
    roomType: 'general',
    floor: 1,
    capacity: 1,
    assignedDevices: [],
    status: 'available',
    description: ''
  });

  const isEditing = !!roomId;

  // Load room beds when editing
  useEffect(() => {
    if (roomId) {
      loadRoomBeds();
    }
  }, [roomId]);

  const loadRoomBeds = async () => {
    if (!roomId) return;
    
    try {
      const beds = await getRoomBeds(roomId);
      setRoomBeds(beds);
    } catch (err) {
      console.error('Error loading room beds:', err);
    }
  };

  // Set initial form data when editing
  useEffect(() => {
    if (roomId && Object.keys(patients).length > 0) {
      // Check if any beds in the room are occupied to determine room status
      const roomBedsOccupied = Object.values(roomBeds).some(bed => bed.status === 'occupied');

      setFormData({
        roomId: roomId.split('_')[1] || '',
        roomType: 'general', // Default, would come from backend
        floor: 1, // Default, would come from backend
        capacity: 1,
        assignedDevices: [], // No longer used for assignment
        status: roomBedsOccupied ? 'occupied' : 'available',
        description: ''
      });
    }
  }, [roomId, iotDevices, patients, roomBeds]);

  const availablePatients = Object.entries(patients).filter(([_, patient]) => 
    !patient.personalInfo.roomId || patient.personalInfo.roomId === roomId
  );

  // Function to handle monitor assignment to beds
  const handleMonitorBedAssignment = async (bedId: string, monitorId: string) => {
    const loadingKey = `bed_${bedId}`;
    
    setAssignmentLoading(prev => ({ ...prev, [loadingKey]: true }));
    setError(null);

    try {
      if (monitorId === '') {
        // Unassign monitor from bed only
        await unassignMonitorsFromBed(bedId);
      } else {
        // Check if this bed already has a monitor assigned
        const existingMonitor = Object.entries(iotDevices).find(([_, device]) => 
          device.deviceInfo?.bedId === bedId
        );
        
        if (existingMonitor) {
          throw new Error(`Bed ${bedId} already has monitor ${existingMonitor[0]} assigned. Please remove the existing monitor first.`);
        }

        // Check if the monitor being assigned is already assigned to another bed
        const currentDevice = iotDevices[monitorId];
        if (!currentDevice) {
          throw new Error(`Monitor ${monitorId} not found`);
        }

        if (currentDevice.deviceInfo?.bedId) {
          throw new Error(`Monitor ${monitorId} is already assigned to bed ${currentDevice.deviceInfo.bedId}. Please unassign it first.`);
        }

        // Check if monitor is in the same room
        if (currentDevice.deviceInfo?.roomId !== roomId) {
          throw new Error(`Monitor ${monitorId} is not in this room. Please add it to the room first.`);
        }
        
        // Prepare the updated device info
        const updatedDeviceInfo = {
          ...currentDevice.deviceInfo, // Preserve existing device info
          roomId: roomId, // Ensure room assignment
          bedId: bedId    // Assign to specific bed
        };
        
        console.log('Assigning monitor to bed:', {
          monitorId,
          bedId,
          roomId,
          currentDeviceInfo: currentDevice.deviceInfo,
          updatedDeviceInfo
        });
        
        // Assign the new monitor to this bed
        const response = await fetch(`${API_BASE_URL}/iotData/${monitorId}/deviceInfo`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedDeviceInfo),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.detail || `Failed to assign monitor ${monitorId} to bed ${bedId}`);
        }

        console.log(`✓ Successfully assigned monitor ${monitorId} to bed ${bedId}`);
      }
      
      // Refresh both bed data and IoT devices data to reflect changes
      await Promise.all([
        loadRoomBeds(),
        refreshAlertsOnly() // Only refresh IoT devices instead of all data
      ]);
      
    } catch (err) {
      console.error('Error handling monitor bed assignment:', err);
      setError(err instanceof Error ? err.message : 'Failed to update monitor assignment');
    } finally {
      setAssignmentLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Function to confirm and execute dangerous actions
  const confirmAndExecuteAction = async () => {
    if (!confirmAction.type) return;

    const loadingKey = `discharge_${confirmAction.bedId}`;

    setAssignmentLoading(prev => ({ ...prev, [loadingKey]: true }));
    setError(null);

    try {
      if (confirmAction.type === 'discharge_patient' && confirmAction.bedId && confirmAction.patientId) {
        // First, unassign any monitors from the patient
        try {
          await unassignPatientFromMonitors(confirmAction.patientId);
        } catch (monitorError) {
          console.warn('Failed to unassign patient from monitors:', monitorError);
        }

        const result = await dischargePatientFromBed(confirmAction.bedId, confirmAction.patientId);
        if (!result.success) {
          throw new Error(result.error || 'Failed to discharge patient from bed');
        }
        
        // Unassign monitors from this bed (but keep them in the room)
        try {
          await unassignMonitorsFromBed(confirmAction.bedId);
        } catch (monitorError) {
          console.warn('Failed to unassign monitors:', monitorError);
        }
      }

      // Refresh data
      await Promise.all([
        loadRoomBeds(),
        refreshAlertsOnly() // Only refresh IoT devices instead of all data
      ]);

    } catch (err) {
      console.error('Error executing confirmed action:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute action');
    } finally {
      setAssignmentLoading(prev => ({ ...prev, [loadingKey]: false }));
      setConfirmAction({ type: null });
    }
  };

  const handlePatientBedAssignment = async (bedId: string, patientId: string) => {
    const loadingKey = `patient_${bedId}`;
    setAssignmentLoading(prev => ({ ...prev, [loadingKey]: true }));
    setError(null);

    try {
      const result = await assignPatientToBed(bedId, patientId);
      if (result.success) {
        // Also assign any available monitors to this bed
        try {
          await assignMonitorsToBed(bedId);
        } catch (monitorError) {
          console.warn('Failed to auto-assign monitor:', monitorError);
          // Don't fail the whole operation if monitor assignment fails
        }
        
        // Refresh both bed data and IoT devices data
        await Promise.all([
          loadRoomBeds(),
          refreshAlertsOnly() // Only refresh IoT devices instead of all data
        ]);
      } else {
        throw new Error(result.error || 'Failed to assign patient to bed');
      }
    } catch (err) {
      console.error('Error assigning patient to bed:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign patient to bed');
    } finally {
      setAssignmentLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handlePatientBedDischarge = async (bedId: string, patientId: string) => {
    // Show confirmation dialog for patient discharge
    setConfirmAction({
      type: 'discharge_patient',
      bedId,
      patientId
    });
  };

  // Function to assign available monitors to a bed when patient is assigned
  const assignMonitorsToBed = async (bedId: string) => {
    try {
      // First check if this bed already has a monitor assigned
      const existingMonitor = Object.entries(iotDevices).find(([_, device]) => 
        device.deviceInfo?.bedId === bedId
      );

      if (existingMonitor) {
        console.log(`Bed ${bedId} already has monitor ${existingMonitor[0]} assigned. Skipping auto-assignment.`);
        return; // Exit early if bed already has a monitor
      }

      // Find monitors that can be assigned to this room and bed
      const roomMonitors = Object.entries(iotDevices).filter(([_, device]) => 
        device.deviceInfo?.type === 'vitals_monitor' &&
        !device.deviceInfo?.bedId && // Not assigned to any bed
        (device.deviceInfo?.roomId === roomId || !device.deviceInfo?.roomId) // Either in this room or no room
      );

      console.log('assignMonitorsToBed debug:', {
        roomId,
        bedId,
        hasExistingMonitor: !!existingMonitor,
        roomMonitors: roomMonitors.map(([id, device]) => ({ 
          id, 
          roomId: device.deviceInfo?.roomId, 
          type: device.deviceInfo?.type,
          bedId: device.deviceInfo?.bedId 
        }))
      });

      // Assign the first available monitor to this bed
      if (roomMonitors.length > 0) {
        const [monitorId] = roomMonitors[0];
        const currentDevice = iotDevices[monitorId];
        
        if (currentDevice) {
          const updatedDeviceInfo = {
            ...currentDevice.deviceInfo, // Preserve existing device info
            roomId: roomId, // Ensure room assignment
            bedId: bedId    // Assign to specific bed
          };

          const response = await fetch(`${API_BASE_URL}/iotData/${monitorId}/deviceInfo`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedDeviceInfo),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error(`Failed to assign monitor ${monitorId} to bed ${bedId}:`, errorData);
            throw new Error(errorData?.detail || `Failed to assign monitor ${monitorId} to bed`);
          }

          console.log(`✓ Successfully auto-assigned monitor ${monitorId} to bed ${bedId}`);
        }
      } else {
        console.log('No available monitors found for auto-assignment');
      }
    } catch (err) {
      console.error('Error assigning monitors to bed:', err);
      throw err; // Re-throw to be handled by caller
    }
  };

  // Function to unassign monitors from a bed when patient is discharged
  const unassignMonitorsFromBed = async (bedId: string) => {
    try {
      // Find monitors assigned to this bed
      const bedMonitors = Object.entries(iotDevices).filter(([_, device]) => 
        device.deviceInfo?.bedId === bedId
      );

      console.log(`Unassigning ${bedMonitors.length} monitors from bed ${bedId}`);

      // Remove bed assignment but keep room assignment
      for (const [monitorId] of bedMonitors) {
        const currentDevice = iotDevices[monitorId];
        
        if (currentDevice) {
          const updatedDeviceInfo = {
            ...currentDevice.deviceInfo, // Preserve existing device info
            bedId: null, // Remove bed assignment but keep roomId
            currentPatientId: null // Also clear patient assignment when unassigning from bed
          };

          const response = await fetch(`${API_BASE_URL}/iotData/${monitorId}/deviceInfo`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedDeviceInfo),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error(`Failed to unassign monitor ${monitorId} from bed ${bedId}:`, errorData);
            throw new Error(errorData?.detail || `Failed to unassign monitor ${monitorId}`);
          }

          console.log(`✓ Successfully unassigned monitor ${monitorId} from bed ${bedId}`);
        }
      }
    } catch (err) {
      console.error('Error unassigning monitors from bed:', err);
      throw err; // Re-throw to be handled by caller
    }
  };

  // Function to unassign patient from all monitors
  const unassignPatientFromMonitors = async (patientId: string) => {
    try {
      // Find monitors assigned to this patient
      const patientMonitors = Object.entries(iotDevices).filter(([_, device]) => 
        device.deviceInfo?.currentPatientId === patientId
      );

      console.log(`Unassigning patient ${patientId} from ${patientMonitors.length} monitors`);

      // Remove patient assignment from all monitors
      for (const [monitorId] of patientMonitors) {
        const currentDevice = iotDevices[monitorId];
        
        if (currentDevice) {
          const updatedDeviceInfo = {
            ...currentDevice.deviceInfo, // Preserve existing device info
            currentPatientId: null // Clear patient assignment
          };

          const response = await fetch(`${API_BASE_URL}/iotData/${monitorId}/deviceInfo`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedDeviceInfo),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error(`Failed to unassign patient ${patientId} from monitor ${monitorId}:`, errorData);
            throw new Error(errorData?.detail || `Failed to unassign patient from monitor ${monitorId}`);
          }

          console.log(`✓ Successfully unassigned patient ${patientId} from monitor ${monitorId}`);
        }
      }
    } catch (err) {
      console.error('Error unassigning patient from monitors:', err);
      throw err; // Re-throw to be handled by caller
    }
  };

  // Function to add monitor to room
  const addMonitorToRoom = async (monitorId: string) => {
    const loadingKey = `add_monitor_${monitorId}`;
    setAssignmentLoading(prev => ({ ...prev, [loadingKey]: true }));
    setError(null);

    try {
      const currentDevice = iotDevices[monitorId];
      if (!currentDevice) {
        throw new Error(`Monitor ${monitorId} not found`);
      }

      const updatedDeviceInfo = {
        ...currentDevice.deviceInfo,
        roomId: roomId,
        bedId: null, // Don't assign to specific bed yet
        currentPatientId: null
      };

      console.log('Adding monitor to room:', {
        monitorId,
        roomId,
        currentDeviceInfo: currentDevice.deviceInfo,
        updatedDeviceInfo
      });

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/iotData/${monitorId}/deviceInfo`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedDeviceInfo),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error(`Failed to add monitor ${monitorId} to room:`, errorData);
        throw new Error(errorData?.detail || `Failed to add monitor ${monitorId} to room`);
      }

      console.log(`✓ Successfully added monitor ${monitorId} to room ${roomId}`);
      
      // Refresh data
      await Promise.all([
        loadRoomBeds(),
        refreshAlertsOnly() // Only refresh IoT devices instead of all data
      ]);

    } catch (err) {
      console.error('Error adding monitor to room:', err);
      setError(err instanceof Error ? err.message : 'Failed to add monitor to room');
    } finally {
      setAssignmentLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Function to remove monitor from room
  const removeMonitorFromRoom = async (monitorId: string) => {
    const loadingKey = `remove_monitor_${monitorId}`;
    setAssignmentLoading(prev => ({ ...prev, [loadingKey]: true }));
    setError(null);

    try {
      const currentDevice = iotDevices[monitorId];
      if (!currentDevice) {
        throw new Error(`Monitor ${monitorId} not found`);
      }

      const updatedDeviceInfo = {
        ...currentDevice.deviceInfo,
        roomId: null,
        bedId: null,
        currentPatientId: null
      };

      console.log('Removing monitor from room:', {
        monitorId,
        roomId,
        currentDeviceInfo: currentDevice.deviceInfo,
        updatedDeviceInfo
      });

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/iotData/${monitorId}/deviceInfo`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedDeviceInfo),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error(`Failed to remove monitor ${monitorId} from room:`, errorData);
        throw new Error(errorData?.detail || `Failed to remove monitor ${monitorId} from room`);
      }

      console.log(`✓ Successfully removed monitor ${monitorId} from room`);
      
      // Refresh data
      await Promise.all([
        loadRoomBeds(),
        refreshAlertsOnly() // Only refresh IoT devices instead of all data
      ]);

    } catch (err) {
      console.error('Error removing monitor from room:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove monitor from room');
    } finally {
      setAssignmentLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const requestData = {
        ...formData,
        roomId: `room_${formData.roomId}`, // Format as room_XXX
        assignedDevices: [] // No longer used for assignment, handled per-bed
      };

      let result;
      if (isEditing) {
        result = await updateRoom(roomId!, requestData);
      } else {
        result = await addRoom(requestData);
      }

      if (result.success) {

        onClose();
      } else {
        setError(result.errors?.message || `Failed to ${isEditing ? 'update' : 'create'} room`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getBedStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return 'bg-red-100 text-red-800';
      case 'available': return 'bg-green-100 text-green-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'cleaning': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Room' : 'Add New Room'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Room ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room Number *
              </label>
              <input
                type="text"
                required
                value={formData.roomId}
                onChange={(e) => setFormData(prev => ({ ...prev, roomId: e.target.value }))}
                disabled={isEditing}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isEditing ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                placeholder="e.g., 101, 205A"
              />
              {/* {isEditing && (
                <p className="text-sm text-gray-500 mt-1">
                  Room ID cannot be changed when editing
                </p>
              )} */}
            </div>

            {/* Room Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room Type *
              </label>
              <select
                required
                value={formData.roomType}
                onChange={(e) => setFormData(prev => ({ ...prev, roomType: e.target.value as RoomData['roomType'] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="general">General</option>
                <option value="ICU">ICU</option>
                <option value="ER">Emergency Room</option>
                <option value="surgery">Surgery</option>
                <option value="isolation">Isolation</option>
              </select>
            </div>

            {/* Floor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Floor *
              </label>
              <input
                type="number"
                required
                min="1"
                disabled={isEditing}
                value={formData.floor}
                onChange={(e) => setFormData(prev => ({ ...prev, floor: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Capacity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bed Capacity *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.capacity}
                onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status */}
            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room Status *
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as RoomData['status'] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="maintenance">Maintenance</option>
                <option value="reserved">Reserved</option>
              </select>
            </div> */}
          </div>

          {/* Device Assignment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Monitor className="inline h-4 w-4 mr-2" />
              Monitor Assignment to Beds
            </label>
            <p className="text-sm text-gray-600 mb-4">
              Assign vital sign monitors to specific beds. Monitors will automatically link to patients when assigned.
            </p>
            
           
            
            <div className="border border-gray-200 rounded-md p-4 space-y-4">
              {/* Room Monitor Management */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Room Monitor Management</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {/* Monitors in this room */}
                  {Object.entries(iotDevices)
                    .filter(([_, device]) => device.deviceInfo?.roomId === roomId && device.deviceInfo?.type === 'vitals_monitor')
                    .map(([monitorId, device]) => (
                      <div key={monitorId} className="flex items-center space-x-2 bg-white px-3 py-2 rounded-md border border-blue-300">
                        <Monitor className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">
                          {monitorId.replace(/^m/, 'M').replace(/_/g, ' ')}
                        </span>
                        {device.deviceInfo?.bedId && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Bed {Object.entries(roomBeds).find(([bedId]) => bedId === device.deviceInfo?.bedId)?.[1]?.bedNumber || device.deviceInfo.bedId}
                          </span>
                        )}
                        <button
                          onClick={() => removeMonitorFromRoom(monitorId)}
                          disabled={assignmentLoading[`remove_monitor_${monitorId}`]}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50"
                          title="Remove from room"
                        >
                          {assignmentLoading[`remove_monitor_${monitorId}`] ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  
                  {Object.entries(iotDevices).filter(([_, device]) => device.deviceInfo?.roomId === roomId && device.deviceInfo?.type === 'vitals_monitor').length === 0 && (
                    <span className="text-sm text-gray-500">No monitors assigned to this room</span>
                  )}
                </div>
                
                {/* Add monitor to room */}
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-blue-800">Available Monitors:</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(iotDevices)
                      .filter(([_, device]) => 
                        device.deviceInfo?.type === 'vitals_monitor' &&
                        !device.deviceInfo?.roomId // Not assigned to any room
                      )
                      .map(([deviceId]) => (
                        <button
                          key={deviceId}
                          onClick={() => addMonitorToRoom(deviceId)}
                          disabled={assignmentLoading[`add_monitor_${deviceId}`]}
                          className="flex items-center justify-center px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 hover:border-green-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {assignmentLoading[`add_monitor_${deviceId}`] ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                              Adding...
                            </>
                          ) : (
                            <>
                              <Monitor className="h-4 w-4 mr-2" />
                              Add {deviceId.replace(/^m/, 'M').replace(/_/g, ' ')}
                            </>
                          )}
                        </button>
                      ))}
                  </div>
                  {Object.entries(iotDevices).filter(([_, device]) => 
                    device.deviceInfo?.type === 'vitals_monitor' &&
                    !device.deviceInfo?.roomId
                  ).length === 0 && (
                    <div className="text-center py-2 text-sm text-gray-500 bg-gray-50 rounded-md border border-gray-200">
                      No unassigned monitors available
                    </div>
                  )}
                </div>
              </div>
              
              {/* Available Beds */}
              {Object.entries(roomBeds).length > 0 ? (
                Object.entries(roomBeds).map(([bedId, bed]) => {
                  // Find monitor assigned to this bed
                  const assignedMonitor = Object.entries(iotDevices).find(([_, device]) => 
                    device.deviceInfo?.bedId === bedId
                  );
                  
                  // Find available monitors (not assigned to any bed)
                  // Only include monitors that are already in this room
                  const availableMonitors = Object.entries(iotDevices).filter(([_, device]) => 
                    device.deviceInfo?.type === 'vitals_monitor' &&
                    !device.deviceInfo?.bedId && // Not assigned to any bed
                    device.deviceInfo?.roomId === roomId // Must be in this room
                  );

                  // Get current patient assignment for monitor if exists
                  const monitorPatientId = assignedMonitor?.[1]?.deviceInfo?.currentPatientId;
                  const currentPatient = monitorPatientId ? patients[monitorPatientId] : null;

                  return (
                    <div key={bedId} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-gray-900">
                          Bed {bed.bedNumber} ({bed.type})
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getBedStatusColor(bed.status)}`}>
                          {bed.status}
                        </span>
                      </div>
                      
                      {/* Patient Info */}
                      {bed.patientId && patients[bed.patientId] && (
                        <div className="mb-2 text-sm text-gray-600">
                          Patient: {patients[bed.patientId].personalInfo.name}
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">Monitor Assignment:</span>
                          {assignedMonitor ? (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                              📱 {assignedMonitor[0].replace(/^m/, 'M').replace(/_/g, ' ')}
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                              No monitor assigned
                            </span>
                          )}
                        </div>

                        <div className="flex space-x-2">
                          {assignedMonitor ? (
                            <button
                              onClick={() => handleMonitorBedAssignment(bedId, '')}
                              disabled={assignmentLoading[`bed_${bedId}`]}
                              className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {assignmentLoading[`bed_${bedId}`] ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                                  Removing...
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Remove Monitor
                                </>
                              )}
                            </button>
                          ) : availableMonitors.length > 0 ? (
                            <div className="flex-1 space-y-2">
                              <div className="grid grid-cols-1 gap-2">
                                {availableMonitors.map(([deviceId]) => (
                                  <button
                                    key={deviceId}
                                    onClick={() => handleMonitorBedAssignment(bedId, deviceId)}
                                    disabled={assignmentLoading[`bed_${bedId}`]}
                                    className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {assignmentLoading[`bed_${bedId}`] ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                        Assigning...
                                      </>
                                    ) : (
                                      <>
                                        <Monitor className="h-4 w-4 mr-2" />
                                        Assign {deviceId.replace(/^m/, 'M').replace(/_/g, ' ')}
                                      </>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 text-center py-2 text-sm text-gray-500 bg-gray-50 rounded-md border border-gray-200">
                              No monitors available in this room
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Monitor Status and Patient Assignment Info */}
                      {assignedMonitor ? (
                        <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                          <div className="flex items-center text-green-700 mb-2">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            <span className="font-medium">
                              Monitor {assignedMonitor[0].replace(/^m/, 'M').replace(/_/g, ' ')} Successfully Assigned
                            </span>
                          </div>
                          {monitorPatientId ? (
                            <div className="flex items-center text-blue-700 text-sm">
                              <div className="h-2 w-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                              <span className="font-medium">Active Link:</span>
                              <span className="ml-1">{currentPatient?.personalInfo?.name || monitorPatientId}</span>
                            </div>
                          ) : bed.patientId ? (
                            <div className="flex items-center text-orange-600 text-sm">
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              <div>
                                <span className="font-medium">Ready for Patient Link</span>
                                <div className="text-xs mt-1 bg-orange-50 px-2 py-1 rounded">
                                  💡 Tip: Use Device Management to link this monitor to the patient
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center text-gray-600 text-sm">
                              <div className="h-2 w-2 bg-gray-400 rounded-full mr-2"></div>
                              <span>Monitor ready - awaiting patient assignment to bed</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center text-gray-500 text-sm">
                            <XCircle className="h-4 w-4 mr-2" />
                            <span>No monitor assigned to this bed</span>
                          </div>
                          {availableMonitors.length > 0 ? (
                            <div className="text-xs text-blue-600 mt-1">
                              💡 {availableMonitors.length} monitor(s) available for assignment
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500 mt-1">
                              No monitors available in this room
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>No beds available in this room.</p>
                  <p className="text-xs mt-1">Add beds to assign monitors.</p>
                </div>
              )}
              
 
            </div>
          </div>

          {/* Bed Management Section - Show only when editing */}
          {isEditing && Object.keys(roomBeds).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <BedIcon className="inline h-4 w-4 mr-2" />
                Bed Management
              </label>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(roomBeds).map(([bedId, bed]) => (
                    <div key={bedId} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">
                          Bed {bed.bedNumber} ({bed.type})
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getBedStatusColor(bed.status)}`}>
                          {bed.status}
                        </span>
                      </div>
                      
                      {bed.patientId ? (
                        <div className="space-y-3">
                          <div className="flex items-center p-2 bg-blue-50 rounded-md">
                            <CheckCircle className="h-4 w-4 text-blue-600 mr-2" />
                            <div>
                              <p className="text-sm font-medium text-blue-900">
                                Patient: {patients[bed.patientId]?.personalInfo.name || bed.patientId}
                              </p>
                              <p className="text-xs text-blue-700">Currently occupying this bed</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePatientBedDischarge(bedId, bed.patientId!)}
                            disabled={assignmentLoading[`discharge_${bedId}`]}
                            className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {assignmentLoading[`discharge_${bedId}`] ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                                Discharging Patient...
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 mr-2" />
                                Discharge Patient
                              </>
                            )}
                          </button>
                        </div>
                      ) : bed.status === 'available' && (
                        <div className="space-y-2">
                          <div className="flex items-center p-2 bg-green-50 rounded-md">
                            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                            <p className="text-sm text-green-900">Bed available for patient assignment</p>
                          </div>
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handlePatientBedAssignment(bedId, e.target.value);
                                e.target.value = ''; // Reset selection
                              }
                            }}
                            disabled={assignmentLoading[`patient_${bedId}`]}
                            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="">
                              {assignmentLoading[`patient_${bedId}`] ? '🔄 Assigning patient...' : '👤 Select patient to assign...'}
                            </option>
                            {!assignmentLoading[`patient_${bedId}`] && availablePatients.map(([patientId, patient]) => (
                              <option key={patientId} value={patientId}>
                                👤 {patient.personalInfo.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      {bed.features && bed.features.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500">
                            Features: {bed.features.join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Optional room description..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Saving...' : (isEditing ? 'Update Room' : 'Create Room')}</span>
            </button>
          </div>
        </form>

        {/* Confirmation Dialog */}
        {confirmAction.type && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <AlertTriangle className="h-6 w-6 text-orange-500 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Confirm Action
                  </h3>
                </div>
                
                {confirmAction.type === 'discharge_patient' && (
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-3">
                      You are about to discharge the patient from this bed. This will:
                    </p>
                    <ul className="text-sm text-gray-700 space-y-1 ml-4">
                      <li>• 👤 Remove patient from bed</li>
                      <li>• 🛏️ Mark bed as available</li>
                      <li>• 📱 Unassign monitor from bed (keep in room)</li>
                      <li>• 🔗 Clear patient-monitor link</li>
                    </ul>
                    <div className="mt-3 p-3 bg-blue-50 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>Patient:</strong> {confirmAction.patientId && patients[confirmAction.patientId]?.personalInfo?.name || confirmAction.patientId}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={() => setConfirmAction({ type: null })}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmAndExecuteAction}
                    disabled={assignmentLoading[`discharge_${confirmAction.bedId}`]}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {assignmentLoading[`discharge_${confirmAction.bedId}`]
                      ? 'Processing...' 
                      : 'Confirm'
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomForm;
