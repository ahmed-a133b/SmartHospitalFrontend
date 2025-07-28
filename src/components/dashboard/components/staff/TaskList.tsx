import React, { useState } from 'react';
import { useHospitalData } from '../../../../contexts/HospitalDataContext';
import { CheckCircle, Clock, AlertCircle, Calendar } from 'lucide-react';

interface TaskListProps {
  staffId?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string;
  assignedTo: string;
  patientId?: string;
  roomId?: string;
}

const TaskList: React.FC<TaskListProps> = ({ staffId }) => {
  const { patients } = useHospitalData();
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

  // Mock tasks - in a real app, this would come from the backend
  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'Patient Vitals Check',
      description: 'Perform routine vital signs check for assigned patients',
      priority: 'high',
      status: 'pending',
      dueDate: new Date().toISOString(),
      assignedTo: staffId || '',
      patientId: Object.keys(patients)[0]
    },
    {
      id: '2',
      title: 'Medication Administration',
      description: 'Administer scheduled medications to patients',
      priority: 'high',
      status: 'in_progress',
      dueDate: new Date().toISOString(),
      assignedTo: staffId || '',
      patientId: Object.keys(patients)[0]
    },
    {
      id: '3',
      title: 'Room Inspection',
      description: 'Conduct daily room inspection and cleaning verification',
      priority: 'medium',
      status: 'completed',
      dueDate: new Date().toISOString(),
      assignedTo: staffId || '',
      roomId: 'room-101'
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    }
  };

  const filteredTasks = mockTasks.filter(task => 
    filter === 'all' ? true : task.status === filter
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Task List</h1>
        <div className="flex space-x-2">
          {(['all', 'pending', 'in_progress', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                filter === status 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredTasks.map((task) => (
          <div key={task.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start">
              <div className="flex items-start space-x-4">
                {getStatusIcon(task.status)}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                  <p className="text-gray-600 mt-1">{task.description}</p>
                  
                  <div className="flex items-center space-x-4 mt-4">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Due: {new Date(task.dueDate).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    {task.patientId && patients[task.patientId] && (
                      <div className="text-sm text-gray-600">
                        Patient: {patients[task.patientId].personalInfo.name}
                      </div>
                    )}
                    
                    {task.roomId && (
                      <div className="text-sm text-gray-600">
                        Room: {task.roomId}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
              </div>
            </div>

            {task.status !== 'completed' && (
              <div className="mt-4 flex justify-end space-x-2">
                {task.status === 'pending' && (
                  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">
                    Start Task
                  </button>
                )}
                {task.status === 'in_progress' && (
                  <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium">
                    Complete Task
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Tasks Found</h3>
            <p className="text-gray-600 mt-2">
              {filter === 'all' 
                ? 'You have no tasks assigned at the moment.' 
                : `You have no ${filter.replace('_', ' ')} tasks.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskList;