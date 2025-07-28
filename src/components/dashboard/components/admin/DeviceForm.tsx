import React, { useState, useCallback } from 'react';
import { useHospitalData } from '../../../../contexts/HospitalDataContext';
import { X } from 'lucide-react';
import { IoTDevice } from '../../../../api/types';
import { API_BASE_URL } from '../../../../api/config';

interface DeviceFormProps {
  onClose: () => void;
}

interface NewDeviceForm {
  type: IoTDevice['deviceInfo']['type'];
  manufacturer: string;
  model: string;
  roomId: string;
  bedId: string;
  lastCalibrated: string;
  calibrationDue: string;
  maintenanceSchedule: string;
}

const DeviceForm: React.FC<DeviceFormProps> = ({ onClose }) => {
  const { refreshData } = useHospitalData();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newDevice, setNewDevice] = useState<NewDeviceForm>({
    type: 'vitals_monitor',
    manufacturer: '',
    model: '',
    roomId: '',
    bedId: '',
    lastCalibrated: '',
    calibrationDue: '',
    maintenanceSchedule: ''
  });

  const handleInputChange = (field: keyof NewDeviceForm, value: string) => {
    setNewDevice(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const validateForm = (): boolean => {
    if (!newDevice.manufacturer.trim()) {
      setError('Manufacturer is required');
      return false;
    }
    if (!newDevice.model.trim()) {
      setError('Model is required');
      return false;
    }
    if (!newDevice.roomId.trim()) {
      setError('Room ID is required');
      return false;
    }
    if (!newDevice.bedId.trim()) {
      setError('Bed ID is required');
      return false;
    }
    if (!newDevice.lastCalibrated) {
      setError('Last calibrated date is required');
      return false;
    }
    if (!newDevice.calibrationDue) {
      setError('Calibration due date is required');
      return false;
    }
    if (!newDevice.maintenanceSchedule.trim()) {
      setError('Maintenance schedule is required');
      return false;
    }

    // Validate dates
    const lastCalibrated = new Date(newDevice.lastCalibrated);
    const calibrationDue = new Date(newDevice.calibrationDue);
    const today = new Date();

    if (lastCalibrated > today) {
      setError('Last calibrated date cannot be in the future');
      return false;
    }

    if (calibrationDue <= lastCalibrated) {
      setError('Calibration due date must be after last calibrated date');
      return false;
    }

    return true;
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const deviceData = {
        deviceInfo: {
          type: newDevice.type,
          manufacturer: newDevice.manufacturer.trim(),
          model: newDevice.model.trim(),
          roomId: newDevice.roomId.trim(),
          bedId: newDevice.bedId.trim(),
          lastCalibrated: newDevice.lastCalibrated,
          calibrationDue: newDevice.calibrationDue,
          maintenanceSchedule: newDevice.maintenanceSchedule.trim()
        },
        vitals: {},
        alerts: {}
      };

      const response = await fetch(`${API_BASE_URL}/iotData`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deviceData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create device: ${response.status}`);
      }

      // Success - refresh data and close form
      await refreshData();
      onClose();
    } catch (err) {
      console.error('Failed to create device:', err);
      setError(err instanceof Error ? err.message : 'Failed to create device. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [newDevice, refreshData, onClose]);

  const handleCancel = () => {
    onClose();
  };

  const deviceTypeOptions = [
    { value: 'vitals_monitor', label: 'Vitals Monitor' },
    { value: 'bed_sensor', label: 'Bed Sensor' },
    { value: 'infusion_pump', label: 'Infusion Pump' },
    { value: 'ventilator', label: 'Ventilator' }
  ] as const;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Add New IoT Device</h3>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            aria-label="Close form"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="device-type" className="block text-sm font-medium text-gray-700 mb-1">
              Device Type *
            </label>
            <select
              id="device-type"
              value={newDevice.type}
              onChange={(e) => handleInputChange('type', e.target.value as IoTDevice['deviceInfo']['type'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {deviceTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="manufacturer" className="block text-sm font-medium text-gray-700 mb-1">
              Manufacturer *
            </label>
            <input
              id="manufacturer"
              type="text"
              value={newDevice.manufacturer}
              onChange={(e) => handleInputChange('manufacturer', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Philips, GE Healthcare, Medtronic"
              required
            />
          </div>

          <div>
            <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
              Model *
            </label>
            <input
              id="model"
              type="text"
              value={newDevice.model}
              onChange={(e) => handleInputChange('model', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., MX800, IntelliVue, PurePac"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="room-id" className="block text-sm font-medium text-gray-700 mb-1">
                Room ID *
              </label>
              <input
                id="room-id"
                type="text"
                value={newDevice.roomId}
                onChange={(e) => handleInputChange('roomId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 101, ICU-A"
                required
              />
            </div>
            <div>
              <label htmlFor="bed-id" className="block text-sm font-medium text-gray-700 mb-1">
                Bed ID *
              </label>
              <input
                id="bed-id"
                type="text"
                value={newDevice.bedId}
                onChange={(e) => handleInputChange('bedId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., A, B, 1, 2"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="last-calibrated" className="block text-sm font-medium text-gray-700 mb-1">
              Last Calibrated *
            </label>
            <input
              id="last-calibrated"
              type="date"
              value={newDevice.lastCalibrated}
              onChange={(e) => handleInputChange('lastCalibrated', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              max={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div>
            <label htmlFor="calibration-due" className="block text-sm font-medium text-gray-700 mb-1">
              Calibration Due *
            </label>
            <input
              id="calibration-due"
              type="date"
              value={newDevice.calibrationDue}
              onChange={(e) => handleInputChange('calibrationDue', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min={newDevice.lastCalibrated || new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div>
            <label htmlFor="maintenance-schedule" className="block text-sm font-medium text-gray-700 mb-1">
              Maintenance Schedule *
            </label>
            <select
              id="maintenance-schedule"
              value={newDevice.maintenanceSchedule}
              onChange={(e) => handleInputChange('maintenanceSchedule', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select maintenance schedule</option>
              <option value="Weekly">Weekly</option>
              <option value="Bi-weekly">Bi-weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Semi-annually">Semi-annually</option>
              <option value="Annually">Annually</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 ${
                submitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {submitting ? 'Creating Device...' : 'Create Device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeviceForm;
