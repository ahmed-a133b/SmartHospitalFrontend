import React, { useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useHospitalData } from '../../../../contexts/HospitalDataContext';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';

interface StaffScheduleProps {
  staffId?: string;
}

const StaffSchedule: React.FC<StaffScheduleProps> = ({ staffId }) => {
  const { user } = useAuth();
  const { staff } = useHospitalData();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const currentStaff = staffId ? staff[staffId] : undefined;
  const scheduleData = currentStaff?.schedule[selectedDate];

  const getShiftTypeColor = (shiftType: string) => {
    switch (shiftType) {
      case 'day': return 'bg-yellow-100 text-yellow-800';
      case 'night': return 'bg-blue-100 text-blue-800';
      case 'on-call': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Generate a week's worth of dates for the schedule view
  const getWeekDates = () => {
    const dates = [];
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
        <div className="text-sm text-gray-500">
          Week of {new Date(weekDates[0]).toLocaleDateString()}
        </div>
      </div>

      {/* Current Status */}
      {currentStaff && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <div className={`h-3 w-3 rounded-full ${currentStaff.currentStatus.onDuty ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <p className="text-lg font-semibold text-gray-900">
                  {currentStaff.currentStatus.onDuty ? 'On Duty' : 'Off Duty'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Current Location</p>
                <p className="text-lg font-semibold text-gray-900">{currentStaff.currentStatus.location}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="h-5 w-5 bg-gray-200 rounded-full">
                  <div 
                    className="h-5 w-5 bg-blue-600 rounded-full" 
                    style={{ 
                      clipPath: `polygon(0 0, ${currentStaff.currentStatus.workload}% 0, ${currentStaff.currentStatus.workload}% 100%, 0 100%)` 
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Workload</p>
                <p className="text-lg font-semibold text-gray-900">{currentStaff.currentStatus.workload}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Schedule */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Weekly Schedule</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
              <div key={day} className="text-center">
                <div className="text-sm font-medium text-gray-600 mb-2">{day}</div>
                <div className="text-lg font-semibold text-gray-900 mb-2">
                  {new Date(weekDates[index]).getDate()}
                </div>
                {currentStaff?.schedule[weekDates[index]] ? (
                  <div className="space-y-2">
                    <div className={`p-2 rounded text-xs font-medium ${getShiftTypeColor(currentStaff.schedule[weekDates[index]].shiftType)}`}>
                      {currentStaff.schedule[weekDates[index]].shiftType}
                    </div>
                    <div className="text-xs text-gray-600">
                      {new Date(currentStaff.schedule[weekDates[index]].shiftStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-xs text-gray-600">
                      {currentStaff.schedule[weekDates[index]].ward}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 p-2">
                    Off
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Today's Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Today's Schedule Details</h2>
        </div>
        <div className="p-6">
          {scheduleData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Shift Hours</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {new Date(scheduleData.shiftStart).toLocaleTimeString()} - 
                        {new Date(scheduleData.shiftEnd).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Ward Assignment</p>
                      <p className="text-lg font-semibold text-gray-900">{scheduleData.ward}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Patient Assignments</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {scheduleData.patientAssignments.length} patients
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-3">Assigned Rooms</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {scheduleData.roomIds.map((roomId) => (
                      <div key={roomId} className="px-3 py-2 bg-blue-50 text-blue-800 rounded-lg text-sm font-medium text-center">
                        {roomId}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getShiftTypeColor(scheduleData.shiftType)}`}>
                  <Calendar className="h-4 w-4 mr-2" />
                  {scheduleData.shiftType.charAt(0).toUpperCase() + scheduleData.shiftType.slice(1)} Shift
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Schedule for Today</h3>
              <p className="text-gray-600">You don't have any scheduled shifts for {new Date(selectedDate).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffSchedule;