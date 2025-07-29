import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Users, 
  Activity, 
  Calendar, 
  Settings, 
  Monitor, 
  Building2,
  Heart,
  AlertTriangle, 
  Home,
  UserPlus,
  Bed,
  Stethoscope,
  ClipboardList,
  MapPin,
  MessageCircle
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  userRole?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, userRole }) => {
  const { user } = useAuth();

  const getMenuItems = () => {
    const baseItems = [
      { id: 'overview', label: 'Overview', icon: Home }
    ];

    switch (userRole) {
      case 'admin':
        return [
          ...baseItems,
          { id: 'staff', label: 'Staff Management', icon: UserPlus },
          { id: 'rooms', label: 'Room Management', icon: Bed },
          { id: 'devices', label: 'IoT Devices', icon: Monitor },
          { id: 'alerts', label: 'System Alerts', icon: AlertTriangle },
          { id: 'analytics', label: 'Analytics', icon: Activity },
          { id: 'settings', label: 'Settings', icon: Settings }
        ];
      case 'doctor':
        return [
          ...baseItems,
          { id: 'patients', label: 'My Patients', icon: Stethoscope },
          { id: 'alerts', label: 'Health Alerts', icon: Heart },
          { id: 'monitoring', label: 'Real-time Monitoring', icon: Activity },
          { id: 'analytics', label: 'Patient Analytics', icon: ClipboardList }
        ];
      case 'staff':
        return [
          ...baseItems,
          { id: 'schedule', label: 'My Schedule', icon: Calendar },
          { id: 'rooms', label: 'Room Status', icon: MapPin },
          { id: 'patients', label: 'Assigned Patients', icon: Users },
          { id: 'tasks', label: 'Tasks', icon: ClipboardList }
        ];
      case 'doctor':
        return [
          ...baseItems,
          { id: 'patients', label: 'My Patients', icon: Stethoscope },
          { id: 'alerts', label: 'Health Alerts', icon: Heart },
          { id: 'monitoring', label: 'Real-time Monitoring', icon: Activity },
          { id: 'analytics', label: 'Patient Analytics', icon: ClipboardList },
          { id: 'assistant', label: 'Smart Assistant', icon: MessageCircle }
        ];
      case 'staff':
        return [
          ...baseItems,
          { id: 'schedule', label: 'My Schedule', icon: Calendar },
          { id: 'rooms', label: 'Room Status', icon: MapPin },
          { id: 'patients', label: 'Assigned Patients', icon: Users },
          { id: 'tasks', label: 'Tasks', icon: ClipboardList },
          { id: 'assistant', label: 'Smart Assistant', icon: MessageCircle }
        ];
      default:
        return baseItems;
    }
  };

  const menuItems = getMenuItems();

  return (
    <div className="bg-white shadow-lg h-full w-64 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Smart Hospital</h2>
            <p className="text-sm text-gray-500">Digital Twin</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-medium text-sm">
              {user?.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                console.log('Sidebar: Setting activeView to:', item.id);
                setActiveView(item.id);
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors duration-200 ${
                activeView === item.id
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          {/* <p>Hospital Management System</p>
          <p className="mt-1">v2.1.0</p> */}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;