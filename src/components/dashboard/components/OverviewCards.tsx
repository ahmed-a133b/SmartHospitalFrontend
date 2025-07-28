import React from 'react';
import { useHospitalData } from '../../../contexts/HospitalDataContext';
import { isDeviceOnline } from '../../../utils/deviceUtils';
import { Heart, AlertTriangle, Users, Monitor } from 'lucide-react';

const OverviewCards: React.FC = () => {
  const { patients, staff, iotDevices, getCriticalPatients, getActiveAlerts } = useHospitalData();

  const cards = [
    {
      title: 'Total Patients',
      value: Object.keys(patients).length,
      change: 'Real-time data',
      changeType: 'neutral',
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Critical Cases',
      value: getCriticalPatients().length,
      change: 'Live monitoring',
      changeType: 'neutral',
      icon: Heart,
      color: 'red'
    },
    {
      title: 'Active Devices',
      value: Object.values(iotDevices).filter(d => isDeviceOnline(d)).length,
      change: 'Connected',
      changeType: 'positive',
      icon: Monitor,
      color: 'green'
    },
    {
      title: 'Active Alerts',
      value: getActiveAlerts().length,
      change: 'Real-time alerts',
      changeType: 'neutral',
      icon: AlertTriangle,
      color: 'orange'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      red: 'bg-red-100 text-red-600',
      green: 'bg-green-100 text-green-600',
      orange: 'bg-orange-100 text-orange-600'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getChangeColor = (type: string) => {
    switch (type) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${getColorClasses(card.color)}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4">
              <span className={`text-sm font-medium ${getChangeColor(card.changeType)}`}>
                {card.change}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OverviewCards;