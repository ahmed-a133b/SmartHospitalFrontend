import React from 'react';
import { useHospitalData } from '../../../../contexts/HospitalDataContext';
import { TrendingUp, TrendingDown, Activity, Clock } from 'lucide-react';

const Analytics: React.FC = () => {
  const { patients, staff, iotDevices, loading, error, refreshData } = useHospitalData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-600">Loading analytics data...</div>
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

  // Calculate room occupancy from IoT devices
  const roomOccupancy = Object.values(iotDevices).reduce((acc, device) => {
    const latestVitals = Object.values(device.vitals)[0];
    if (latestVitals?.bedOccupancy) {
      acc.occupied++;
    }
    acc.total++;
    return acc;
  }, { occupied: 0, total: 0 });

  // Calculate staff utilization
  const staffUtilization = Object.values(staff).reduce((acc, s) => acc + s.currentStatus.workload, 0) / Object.keys(staff).length;

  // Calculate device uptime
  const deviceUptime = Object.values(iotDevices).reduce((acc, device) => {
    const latestVitals = Object.values(device.vitals)[0];
    if (latestVitals?.deviceStatus === 'online') {
      acc.online++;
    }
    acc.total++;
    return acc;
  }, { online: 0, total: 0 });

  // Calculate critical patient rate
  const criticalPatients = Object.values(patients).filter(p => p.currentStatus.status === 'critical').length;
  const criticalPatientRate = (criticalPatients / Object.keys(patients).length) * 100;

  const analytics = [
    {
      title: 'Room Occupancy Rate',
      value: `${Math.round((roomOccupancy.occupied / roomOccupancy.total) * 100)}%`,
      change: '+5% from last week',
      changeType: 'positive',
      icon: TrendingUp,
      color: 'blue'
    },
    {
      title: 'Staff Utilization',
      value: `${Math.round(staffUtilization)}%`,
      change: 'Optimal range',
      changeType: 'neutral',
      icon: Activity,
      color: 'green'
    },
    {
      title: 'Device Uptime',
      value: `${Math.round((deviceUptime.online / deviceUptime.total) * 100)}%`,
      change: '+2% from yesterday',
      changeType: 'positive',
      icon: TrendingUp,
      color: 'purple'
    },
    {
      title: 'Critical Patient Rate',
      value: `${Math.round(criticalPatientRate)}%`,
      change: '-3% from last month',
      changeType: 'positive',
      icon: TrendingDown,
      color: 'red'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
      red: 'bg-red-100 text-red-600'
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

  // Group patients by ward
  const patientsByWard = Object.values(patients).reduce<Record<string, number>>((acc, patient) => {
    const ward = patient.personalInfo.ward;
    acc[ward] = (acc[ward] || 0) + 1;
    return acc;
  }, {});

  // Calculate risk level distribution
  const riskDistribution = Object.values(patients).reduce<Record<string, number>>((acc, patient) => {
    const risk = patient.predictions?.riskLevel || 'Unknown';
    acc[risk] = (acc[risk] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {analytics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${getColorClasses(metric.color)}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4">
                <span className={`text-sm font-medium ${getChangeColor(metric.changeType)}`}>
                  {metric.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Department Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Patient Distribution by Ward</h2>
          <div className="space-y-3">
            {Object.entries(patientsByWard).map(([ward, count]) => {
              const percentage = Object.keys(patients).length > 0 ? Math.round((count / Object.keys(patients).length) * 100) : 0;
              return (
                <div key={ward} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{ward}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-8">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Risk Level Distribution</h2>
          <div className="space-y-3">
            {Object.entries(riskDistribution).map(([risk, count]) => {
              const percentage = Object.keys(patients).length > 0 ? Math.round((count / Object.keys(patients).length) * 100) : 0;
              const colors = {
                Critical: 'bg-red-600',
                High: 'bg-orange-600',
                Moderate: 'bg-yellow-600',
                Low: 'bg-green-600',
                Unknown: 'bg-gray-600'
              };
              return (
                <div key={risk} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{risk} Risk</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${colors[risk as keyof typeof colors] || colors.Unknown}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-8">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* System Performance */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">99.8%</p>
            <p className="text-sm text-gray-600">System Uptime</p>
          </div>
          <div className="text-center">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">45ms</p>
            <p className="text-sm text-gray-600">Avg Response Time</p>
          </div>
          <div className="text-center">
            <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">98.5%</p>
            <p className="text-sm text-gray-600">Data Quality</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;