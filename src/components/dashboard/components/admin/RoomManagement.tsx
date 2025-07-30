import React, { useState } from 'react';
import { useHospitalData } from '../../../../contexts/HospitalDataContext';
import { useBeds } from '../../../../api/hooks/useBeds';
import { Plus, Search, Edit, MapPin, Thermometer, Droplets, Bed, Wind, BarChart2 } from 'lucide-react';
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
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Total Rooms</h3>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalRooms}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <MapPin className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Occupied</h3>
              <p className="text-3xl font-bold text-red-600 mt-1">{occupiedRooms}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <Bed className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Available</h3>
              <p className="text-3xl font-bold text-green-600 mt-1">{totalRooms - occupiedRooms}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Bed className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Occupancy Rate</h3>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0}%
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <BarChart2 className="w-6 h-6 text-purple-500" />
            </div>
          </div>
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
            <div key={roomId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-gray-300">
              {/* Header Section */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-lg font-bold text-gray-900">
                        {room.roomId ? `Room ${room.roomId.replace('room_', '')}` : `Room ${roomId.replace('room_', '')}`}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoomTypeColor(room.roomType)}`}>
                        {room.roomType}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {devices.length} devices • {roomBeds.length} beds
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>📍 Floor {Math.ceil(parseInt(roomId.replace('room_', '')) / 100)}</span>
                    </div>
                  </div>
                  
                  {/* Status Indicators */}
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${occupancyDetails.isOccupied ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>
                      {occupancyDetails.isOccupied ? '🏠 Occupied' : '✅ Available'}
                    </span>
                    
                    {devices.length > 0 && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium bg-white border ${getDeviceStatusColor(latestVitals?.deviceStatus || 'offline')}`}>
                        {latestVitals?.deviceStatus || 'offline'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Body Section */}
              <div className="p-4 space-y-4">
                {/* Bed Occupancy Section */}
                {roomBeds.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Bed className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">Bed Status</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-gray-900">
                          {occupancyDetails.occupiedBeds}/{occupancyDetails.totalBeds}
                        </span>
                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                          {Math.round(occupancyDetails.occupancyRate)}%
                        </span>
                      </div>
                    </div>
                    {/* Bed occupancy visual indicator */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          occupancyDetails.occupancyRate > 80 ? 'bg-red-500' : 
                          occupancyDetails.occupancyRate > 50 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${occupancyDetails.occupancyRate}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Patient Information */}
                <div className="space-y-2">
                  <span className="text-sm font-medium text-gray-600">👥 Patients:</span>
                  {patient ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-900">{patient.personalInfo.name}</span>
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">Primary</span>
                      </div>
                    </div>
                  ) : occupancyDetails.isOccupied ? (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-900">{occupancyDetails.occupiedBeds} patients assigned</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-sm text-gray-500 italic">No patients assigned</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Environmental Data */}
                {environmentalData && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                      <span>🌡️ Environmental Data</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-red-50 border border-red-100 rounded-lg p-2 flex items-center space-x-2">
                        <Thermometer className="h-4 w-4 text-red-500" />
                        <div>
                          <div className="text-xs text-red-700 font-medium">Temperature</div>
                          <div className="text-sm font-bold text-red-800">{environmentalData.temperature.toFixed(1)}°C</div>
                        </div>
                      </div>
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 flex items-center space-x-2">
                        <Droplets className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="text-xs text-blue-700 font-medium">Humidity</div>
                          <div className="text-sm font-bold text-blue-800">{environmentalData.humidity}%</div>
                        </div>
                      </div>
                      <div className="bg-green-50 border border-green-100 rounded-lg p-2 flex items-center space-x-2">
                        <Wind className="h-4 w-4 text-green-500" />
                        <div>
                          <div className="text-xs text-green-700 font-medium">Air Quality</div>
                          <div className="text-sm font-bold text-green-800">{environmentalData.airQuality}</div>
                        </div>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-2">
                        <div className="text-xs text-yellow-700 font-medium">CO2</div>
                        <div className="text-sm font-bold text-yellow-800">{environmentalData.co2Level} ppm</div>
                      </div>
                    </div>
                  </div>
                )}

   
               
              </div>
              
              {/* Footer Section */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  Room Type: {room.roomType[0].toUpperCase() + room.roomType.slice(1)}
                </div>
                <div className="flex space-x-2">
          
                  <button className="text-gray-600 hover:text-gray-800 p-1 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    onClick={() => setEditingRoom(roomId)}
                  >
                    <Edit className="h-4 w-4" />
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