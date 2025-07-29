import React from 'react';
import { useHospitalData } from '../../../contexts/HospitalDataContext';
import { useRealTimeAlerts } from '../../../hooks/useRealTimeAlerts';
import OverviewCards from '../components/OverviewCards';
import PatientMonitoring from '../components/doctor/PatientMonitoring';
import HealthAlerts from '../components/doctor/HealthAlerts';
import RealTimeMonitoring from '../components/doctor/RealTimeMonitoring';
import PatientAnalytics from '../components/doctor/PatientAnalytics';
import SmartQueryChat from '../components/SmartQuery/SmartQueryChat';

interface DoctorDashboardProps {
  activeView: string;
}

const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ activeView }) => {
  const { getCriticalPatients } = useHospitalData();
  
  // Use real-time alerts for live updates
  const { alerts: realtimeAlerts } = useRealTimeAlerts({
    pollInterval: 5000, // Poll every 5 seconds
    enabled: true,
    onNewAlert: (alert) => {
      // Optional: You could add toast notifications here
      console.log('🚨 New alert in doctor dashboard:', alert);
    }
  });

  const renderView = () => {
    switch (activeView) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Medical Dashboard</h1>
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleString()}
              </div>
            </div>
            <OverviewCards />
            
            {/* Critical Patients Alert */}
            {getCriticalPatients().length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-red-900 mb-3">
                  Critical Patients Requiring Attention
                </h3>
                <div className="grid gap-3">
                  {getCriticalPatients().map((patient, index) => (
                    <div key={`critical-patient-${index}`} className="bg-white p-4 rounded-lg border border-red-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{patient.personalInfo.name}</h4>
                          <p className="text-sm text-gray-600">
                            Room {patient.personalInfo.roomId} - {patient.currentStatus.diagnosis}
                          </p>
                          <p className="text-sm text-red-600 font-medium">
                            Risk Level: {patient.predictions.riskLevel} 
                            ({patient.predictions.riskScore}% risk score)
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          patient.currentStatus.status === 'critical' 
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {patient.currentStatus.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Alerts */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Health Alerts</h3>
              {realtimeAlerts.filter(alert => !alert.resolved).length > 0 ? (
                <div className="space-y-3">
                  {realtimeAlerts
                    .filter(alert => !alert.resolved)
                    .slice(0, 3)
                    .map((alert) => (
                    <div key={`${alert.deviceId}-${alert.id}`} className="flex items-center space-x-3 p-3 bg-amber-50 rounded-lg">
                      <div className="h-2 w-2 bg-amber-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-900">{alert.message}</p>
                        <p className="text-xs text-amber-600">
                          {alert.timestamp}
                        </p>
                        <p className="text-xs text-amber-600">
                          Device: {alert.deviceId} | Room: {alert.roomId}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        alert.type === 'critical' 
                          ? 'bg-red-100 text-red-800'
                          : alert.type === 'warning'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {alert.type.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No active alerts</p>
              )}
            </div>
          </div>
        );
      case 'patients':
        return <PatientMonitoring />;
      case 'alerts':
        return <HealthAlerts />;
      case 'monitoring':
        return <RealTimeMonitoring />;
      case 'analytics':
        return <PatientAnalytics />;
      case 'assistant':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Smart Medical Assistant</h1>
              <div className="text-sm text-gray-500">
                Ask me about patient conditions, alerts, or room status
              </div>
            </div>
            <SmartQueryChat />
          </div>
        );
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

export default DoctorDashboard;