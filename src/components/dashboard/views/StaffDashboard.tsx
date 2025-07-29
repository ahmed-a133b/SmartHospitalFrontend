import React from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useHospitalData } from '../../../contexts/HospitalDataContext';
import OverviewCards from '../components/OverviewCards';
import StaffSchedule from '../components/staff/StaffSchedule';
import RoomStatus from '../components/staff/RoomStatus';
import AssignedPatients from '../components/staff/AssignedPatients';
import TaskList from '../components/staff/TaskList';

interface StaffDashboardProps {
  activeView: string;
}

const StaffDashboard: React.FC<StaffDashboardProps> = ({ activeView }) => {
  const { user } = useAuth();
  const { staff, iotDevices, patients, loading, error, refreshData } = useHospitalData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-600">Loading...</div>
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

  // Find current staff member
  const currentStaffId = Object.keys(staff).find(id => 
    staff[id].personalInfo.name === user?.name
  );
  const currentStaff = currentStaffId ? staff[currentStaffId] : undefined;

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Get assigned rooms from today's schedule
  const assignedRoomIds = currentStaff?.schedule[today]?.roomIds || [];
  
  // Get assigned rooms' IoT devices
  const assignedRoomDevices = Object.entries(iotDevices).filter(([_, device]) => 
    assignedRoomIds.includes(device.deviceInfo.roomId)
  );

  // Get assigned patients from room assignments
  const assignedPatients = Object.entries(patients).filter(([_, patient]) => 
    assignedRoomIds.includes(patient.personalInfo.roomId)
  ).reduce((acc, [id, patient]) => {
    acc[id] = patient;
    return acc;
  }, {} as Record<string, typeof patients[keyof typeof patients]>);

  const renderView = () => {
    switch (activeView) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name}</h1>
                <p className="text-gray-600">Here's your daily overview</p>
              </div>
              <div className="text-sm text-gray-500">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>

            {/* Current Status */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-green-600 font-bold text-lg">
                      {assignedRoomIds.length}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">Assigned Rooms</p>
                  <p className="text-xs text-gray-500">Active assignments</p>
                </div>
                <div className="text-center">
                  <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-blue-600 font-bold text-lg">
                      {Object.keys(assignedPatients).length}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">Assigned Patients</p>
                  <p className="text-xs text-gray-500">Under your care</p>
                </div>
                <div className="text-center">
                  <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-purple-600 font-bold text-lg">
                      {currentStaff?.currentStatus.workload || 0}%
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">Workload</p>
                  <p className="text-xs text-gray-500">Current capacity</p>
                </div>
              </div>
            </div>

            {/* Today's Schedule Preview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Schedule</h2>
              {currentStaff?.schedule[today] ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-blue-900">
                        {currentStaff.schedule[today].shiftType.charAt(0).toUpperCase() + 
                         currentStaff.schedule[today].shiftType.slice(1)} Shift
                      </p>
                      <p className="text-sm text-blue-700">
                        {currentStaff.schedule[today].ward} Ward
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-blue-900">
                        {new Date(currentStaff.schedule[today].shiftStart).toLocaleTimeString()} - 
                        {new Date(currentStaff.schedule[today].shiftEnd).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No shift scheduled for today</p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button 
                  onClick={() => window.location.hash = '#/schedule'}
                  className="p-4 text-center rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  <p className="font-medium text-gray-900">View Schedule</p>
                </button>
                <button 
                  onClick={() => window.location.hash = '#/patients'}
                  className="p-4 text-center rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  <p className="font-medium text-gray-900">Patient List</p>
                </button>
                <button 
                  onClick={() => window.location.hash = '#/tasks'}
                  className="p-4 text-center rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  <p className="font-medium text-gray-900">Tasks</p>
                </button>
                <button 
                  onClick={refreshData}
                  className="p-4 text-center rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  <p className="font-medium text-gray-900">Refresh Data</p>
                </button>
              </div>
            </div>
          </div>
        );
      case 'schedule':
        return <StaffSchedule staffId={currentStaffId} />;
      case 'rooms':
        return <RoomStatus roomDevices={assignedRoomDevices} />;
      case 'patients':
        return <AssignedPatients patients={assignedPatients} />;
      case 'tasks':
        return <TaskList staffId={currentStaffId} />;
      default:
        return <div>View not found</div>;
    }
  };

  return (
    <div className="p-6">
      {renderView()}
    </div>
  );
};

export default StaffDashboard;