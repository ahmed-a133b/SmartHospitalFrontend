import React from 'react';
import { useHospitalData } from '../../../../contexts/HospitalDataContext';
import { Bed, Users, Thermometer, RefreshCw } from 'lucide-react';
import { IoTDevice } from '../../../../api/types';

interface RoomStatusProps {
  roomDevices: [string, IoTDevice][];
}

const RoomStatus: React.FC<RoomStatusProps> = ({ roomDevices }) => {
  const { patients } = useHospitalData();

  const getDeviceStatusColor = (status: 'online' | 'offline' | 'maintenance') => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800';
      case 'offline': return 'bg-red-100 text-red-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Room Status</h1>
        <div className="text-sm text-gray-500">
          {roomDevices.length} rooms assigned
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roomDevices.map(([deviceId, device]) => {
          const latestVitals = Object.values(device.vitals)[0];
          const patientId = latestVitals?.patientId;
          const patient = patientId ? patients[patientId] : undefined;
          
          return (
            <div key={deviceId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Room {device.deviceInfo.roomId}</h3>
                    <p className="text-sm text-gray-600">Bed {device.deviceInfo.bedId}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${getDeviceStatusColor(latestVitals?.deviceStatus || 'offline')}`}>
                    {latestVitals?.deviceStatus || 'offline'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Bed className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Occupancy</p>
                        <p className="text-sm text-gray-900">
                          {latestVitals?.bedOccupancy ? 'Occupied' : 'Available'}
                        </p>
                      </div>
                    </div>

                    {patient && (
                      <div className="flex items-center space-x-2">
                        <Users className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-600">Patient</p>
                          <p className="text-sm text-gray-900">{patient.personalInfo.name}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Thermometer className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Vitals</p>
                        <p className="text-sm text-gray-900">
                          {latestVitals?.temperature}°F | {latestVitals?.oxygenLevel}% O2
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Last Updated</p>
                        <p className="text-sm text-gray-900">
                          {latestVitals ? new Date(latestVitals.timestamp).toLocaleTimeString() : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Device Status</p>
                      <div className="h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-2 bg-green-500 rounded-full"
                          style={{ width: `${latestVitals?.signalStrength || 0}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Signal: {latestVitals?.signalStrength || 0}% | Battery: {latestVitals?.batteryLevel || 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoomStatus;