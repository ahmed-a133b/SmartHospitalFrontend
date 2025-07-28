import React, { useState } from 'react';
import { useHospitalData } from '../../../../contexts/HospitalDataContext';
import { useBeds } from '../../../../api/hooks/useBeds';
import { Plus, Search, Edit, MapPin, Thermometer, Droplets, Bed, Wind } from 'lucide-react';
import { IoTDevice } from '../../../../api/types';
import { getLatestVitals, getLatestEnvironmentalData } from '../../../../utils/deviceUtils';
import RoomForm from './RoomForm';

interface DeviceWithId extends IoTDevice {
  id: string;
}

const RoomManagement: React.FC = () => {
  const { iotDevices, patients, rooms, loading, error, refreshData } = useHospitalData();
  const { beds } = useBeds();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-600">Loading room data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-lg text-red-600 mb-4">Error: {error}</div>
        <button 
          onClick={refreshData}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  // Get devices for a specific room
  const getDevicesInRoom = (roomId: string): DeviceWithId[] => {
    return Object.entries(iotDevices)
      .filter(([_, device]) => device.deviceInfo?.roomId === roomId)
      .map(([id, device]) => ({ ...device, id }));
  };

  const filteredRooms = Object.entries(rooms).filter(([roomId, room]) =>
    roomId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.roomType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDeviceStatusColor = (status: 'online' | 'offline' | 'maintenance') => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800';
      case 'offline': return 'bg-red-100 text-red-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoomTypeColor = (type: string) => {
    switch (type) {
      case 'ICU': return 'bg-red-100 text-red-800';
      case 'ER': return 'bg-orange-100 text-orange-800';
      case 'surgery': return 'bg-purple-100 text-purple-800';
      case 'isolation': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getPatientInRoom = (roomId: string) => {
    return Object.values(patients).find(p => p.personalInfo?.roomId === roomId);
  };

  // Helper function to get beds in a room
  const getBedsInRoom = (roomId: string) => {
    return Object.entries(beds).filter(([_, bed]) => bed.roomId === roomId);
  };

  // Helper function to check if room is occupied based on bed occupancy
  const isRoomOccupied = (roomId: string) => {
    const roomBeds = getBedsInRoom(roomId);
    return roomBeds.some(([_, bed]) => bed.status === 'occupied' && bed.patientId);
  };

  // Helper function to get occupancy details for a room
  const getRoomOccupancyDetails = (roomId: string) => {
    const roomBeds = getBedsInRoom(roomId);
    const occupiedBeds = roomBeds.filter(([_, bed]) => bed.status === 'occupied' && bed.patientId);
    const totalBeds = roomBeds.length;
    
    return {
      occupiedBeds: occupiedBeds.length,
      totalBeds,
      occupancyRate: totalBeds > 0 ? (occupiedBeds.length / totalBeds) * 100 : 0,
      isOccupied: occupiedBeds.length > 0
    };
  };

  // Calculate room stats based on bed occupancy
  const totalRooms = Object.keys(rooms).length;
  const occupiedRooms = Object.keys(rooms).filter(roomId => isRoomOccupied(roomId)).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Room Management</h1>
        <button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <Plus className="h-5 w-5" />
          <span>Add Room</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Search rooms by ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Total Rooms</h3>
          <p className="text-2xl font-bold text-gray-900">{totalRooms}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Occupied</h3>
          <p className="text-2xl font-bold text-red-600">{occupiedRooms}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Available</h3>
          <p className="text-2xl font-bold text-green-600">{totalRooms - occupiedRooms}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Occupancy Rate</h3>
          <p className="text-2xl font-bold text-blue-600">
            {totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRooms.map(([roomId, room]) => {
          const devices = getDevicesInRoom(roomId);
          const patient = getPatientInRoom(roomId);
          const mainDevice = devices.find(d => d.deviceInfo?.type === 'vitals_monitor') || devices[0];
          const latestVitals = mainDevice ? getLatestVitals(mainDevice) : null;
          const environmentalData = getLatestEnvironmentalData(iotDevices, roomId);
          const roomBeds = getBedsInRoom(roomId);
          const occupancyDetails = getRoomOccupancyDetails(roomId);
          
          return (
            <div key={roomId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {room.roomId ? `Room ${room.roomId.replace('room_', '')}` : `Room ${roomId.replace('room_', '')}`}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {devices.length} devices • {roomBeds.length} beds • {room.roomType}
                    </p>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoomTypeColor(room.roomType)}`}>
                      {room.roomType}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDeviceStatusColor(latestVitals?.deviceStatus || 'offline')}`}>
                      {latestVitals?.deviceStatus || 'offline'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {/* Occupancy Status */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${occupancyDetails.isOccupied ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {occupancyDetails.isOccupied ? 'Occupied' : 'Available'}
                  </span>
                </div>

                {/* Bed Occupancy Details */}
                {roomBeds.length > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Bed Occupancy:</span>
                    <div className="flex items-center space-x-2">
                      <Bed className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-900">
                        {occupancyDetails.occupiedBeds}/{occupancyDetails.totalBeds}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({Math.round(occupancyDetails.occupancyRate)}%)
                      </span>
                    </div>
                  </div>
                )}

                {/* Patient Info */}
                {patient ? (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Primary Patient:</span>
                    <span className="text-sm text-gray-900">{patient.personalInfo.name}</span>
                  </div>
                ) : occupancyDetails.isOccupied ? (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Patients:</span>
                    <span className="text-sm text-gray-900">{occupancyDetails.occupiedBeds} assigned</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Patient:</span>
                    <span className="text-sm text-gray-500 italic">No patients assigned</span>
                  </div>
                )}

                {/* Environmental Data */}
                {environmentalData && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      <Thermometer className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-gray-600">{environmentalData.temperature.toFixed(1)}°C</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Droplets className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-gray-600">{environmentalData.humidity}% RH</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Wind className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-600">AQ: {environmentalData.airQuality}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">CO2:</span>
                      <span className="text-sm text-gray-600">{environmentalData.co2Level} ppm</span>
                    </div>
                  </div>
                )}

                {/* Device Status */}
                <div>
                  <span className="text-sm font-medium text-gray-600">Devices: </span>
                  <span className="text-sm text-gray-900">
                    {devices.filter(d => getLatestVitals(d)?.deviceStatus === 'online').length} online
                  </span>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center pt-2">
                  <button 
                    onClick={() => setEditingRoom(roomId)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View Details
                  </button>
                  
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Room Forms */}
      {showAddForm && (
        <RoomForm onClose={() => setShowAddForm(false)} />
      )}
      
      {editingRoom && (
        <RoomForm 
          roomId={editingRoom} 
          onClose={() => setEditingRoom(null)} 
        />
      )}
    </div>
  );
};

export default RoomManagement;