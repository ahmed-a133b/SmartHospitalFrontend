import React, { useState, useEffect } from 'react';
import { useHospitalData } from '../../../../contexts/HospitalDataContext';
import { AlertTriangle, Heart, CheckCircle, RefreshCw, X, User, MapPin, Calendar, Activity, Pill, AlertCircle } from 'lucide-react';
import { Patient } from '../../../../api/types';

const HealthAlerts: React.FC = () => {
  const { getActiveAlerts, getCriticalPatients, refreshAlertsOnly } = useHospitalData();
  const [filter, setFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const activeAlerts = getActiveAlerts();
  const criticalPatients = getCriticalPatients();

  // Filter and sort alerts based on selected filter (newest first)
  const filteredAlerts = activeAlerts
    .filter(alert => {
      if (filter === 'critical') return alert.alert.type === 'critical';
      if (filter === 'warning') return alert.alert.type === 'warning';
      return true; // 'all' - show all alerts
    })
    .sort((a, b) => {
      // Sort by timestamp in descending order (newest first)
      const timestampA = a.alert.timestamp;
      const timestampB = b.alert.timestamp;
      
      if (!timestampA || !timestampB) return 0;
      
      try {
        let dateA: Date, dateB: Date;
        
        // Handle custom timestamp format (YYYY-MM-DD_HH-MM-SS)
        if (typeof timestampA === 'string' && timestampA.includes('_')) {
          const [datePart, timePart] = timestampA.split('_');
          const [year, month, day] = datePart.split('-');
          const [hour, minute, second] = timePart.split('-');
          dateA = new Date(
            parseInt(year), 
            parseInt(month) - 1, 
            parseInt(day), 
            parseInt(hour), 
            parseInt(minute), 
            parseInt(second || '0')
          );
        } else {
          dateA = new Date(timestampA);
        }
        
        if (typeof timestampB === 'string' && timestampB.includes('_')) {
          const [datePart, timePart] = timestampB.split('_');
          const [year, month, day] = datePart.split('-');
          const [hour, minute, second] = timePart.split('-');
          dateB = new Date(
            parseInt(year), 
            parseInt(month) - 1, 
            parseInt(day), 
            parseInt(hour), 
            parseInt(minute), 
            parseInt(second || '0')
          );
        } else {
          dateB = new Date(timestampB);
        }
        
        // Return descending order (newest first)
        return dateB.getTime() - dateA.getTime();
      } catch (error) {
        console.error('Error sorting alerts by timestamp:', error);
        return 0;
      }
    });

  // Auto-refresh every 60 seconds (reduced from 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      handleAutoRefresh();
    }, 60000); // Increased from 30000 to 60000 (60 seconds)

    return () => clearInterval(interval);
  }, []);

  const handleAutoRefresh = async () => {
    try {
      await refreshAlertsOnly(); // Only refresh alerts instead of all data
      setLastRefresh(new Date());
      console.log('🔄 HealthAlerts: Auto-refreshed data');
    } catch (error) {
      console.error('HealthAlerts: Auto-refresh failed:', error);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAlertsOnly(); // Only refresh alerts instead of all data
      setLastRefresh(new Date());
      console.log('🔄 HealthAlerts: Manual refresh completed');
    } catch (error) {
      console.error('HealthAlerts: Manual refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const openPatientModal = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsModalOpen(true);
  };

  const closePatientModal = () => {
    setSelectedPatient(null);
    setIsModalOpen(false);
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePatientModal();
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  // Helper function to format device ID
  const formatDeviceId = (deviceId: string): string => {
    return deviceId
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
  };

  // Helper function to safely format timestamps
  const formatTimestamp = (timestamp: string | undefined | null): string => {
    if (!timestamp) return 'No timestamp';
    
    try {
      // Debug: log the timestamp being processed
      console.log('HealthAlerts - Formatting timestamp:', timestamp);
      
      let date: Date;
      
      if (typeof timestamp === 'string' && timestamp.includes('_')) {
        const [datePart, timePart] = timestamp.split('_');
        const [year, month, day] = datePart.split('-');
        const [hour, minute, second] = timePart.split('-');
        date = new Date(
          parseInt(year), 
          parseInt(month) - 1, 
          parseInt(day), 
          parseInt(hour), 
          parseInt(minute), 
          parseInt(second || '0')
        );
      } else {
        date = new Date(timestamp);
      }
      
      if (isNaN(date.getTime())) {
        console.warn('HealthAlerts - Invalid date created from timestamp:', timestamp);
        return 'Invalid date';
      }
      
      const result = date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      
      console.log('HealthAlerts - Formatted result:', result);
      return result;
    } catch (error) {
      console.error('HealthAlerts - Error formatting timestamp:', timestamp, error);
      return 'Invalid date format';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Health Alerts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Alerts</option>
            <option value="critical">Critical Only</option>
            <option value="warning">Warnings Only</option>
          </select>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            title="Refresh alerts data"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active Alerts</p>
                <p className="text-2xl font-bold text-red-600">{activeAlerts.length}</p>
              </div>
            </div>
            {isRefreshing && (
              <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
            )}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Heart className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Patients</p>
                <p className="text-2xl font-bold text-orange-600">{criticalPatients.length}</p>
              </div>
            </div>
            {isRefreshing && (
              <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Response Rate</p>
                <p className="text-2xl font-bold text-green-600">98%</p>
              </div>
            </div>
            <div className="text-xs text-gray-500 text-right">
              <div>Auto-refresh</div>
              <div>60s interval</div>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Patients */}
      {criticalPatients.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-red-900">Critical Patients Requiring Immediate Attention</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {criticalPatients.map((patient, index) => (
              <div key={index} className="p-6 hover:bg-red-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <Heart className="h-5 w-5 text-red-600 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{patient.personalInfo.name}</h3>
                      <p className="text-sm text-gray-600">{patient.currentStatus.diagnosis}</p>
                      <p className="text-sm text-gray-500">
                        {patient.personalInfo.roomId ? 
                          `Room ${patient.personalInfo.roomId.split('_')[1] || patient.personalInfo.roomId}` : 
                          'No room assigned'
                        } • {patient.personalInfo.ward}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {patient.predictions.factors.map((factor, factorIndex) => (
                          <span key={factorIndex} className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-red-600">{patient.predictions.riskScore.toFixed(1)}%</span>
                    <p className="text-sm text-gray-600">Risk Score</p>
                    <button 
                      onClick={() => openPatientModal(patient)}
                      className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200"
                    >
                      View Patient
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Device Alerts */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Device Alerts</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {filteredAlerts.length} of {activeAlerts.length} alerts
              </span>
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                title="Refresh alerts"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map((alert, index) => (
              <div key={index} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-1" />
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{alert.alert.message}</h3>
                      <p className="text-sm text-gray-600">Device: {formatDeviceId(alert.deviceId)}</p>
                      <p className="text-sm text-gray-500">
                        {formatTimestamp(alert.alert.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      alert.alert.type === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {alert.alert.type}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'all' ? 'No Active Alerts' : `No ${filter.charAt(0).toUpperCase() + filter.slice(1)} Alerts`}
              </h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? 'All monitoring systems are functioning normally.' 
                  : `No ${filter} alerts at this time.`
                }
              </p>
              {filter !== 'all' && activeAlerts.length > 0 && (
                <button
                  onClick={() => setFilter('all')}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  View all {activeAlerts.length} alerts
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Patient Details Modal */}
      {isModalOpen && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-red-50">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-red-900">{selectedPatient.personalInfo.name}</h2>
                  <p className="text-sm text-red-700">Critical Patient - Immediate Attention Required</p>
                </div>
              </div>
              <button
                onClick={closePatientModal}
                className="p-2 hover:bg-red-100 rounded-full transition-colors duration-200"
              >
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Risk Assessment */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-red-900 flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Risk Assessment
                  </h3>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-red-600">{selectedPatient.predictions.riskScore.toFixed(1)}%</span>
                    <p className="text-sm text-red-700">Risk Score</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-red-800">Risk Level</p>
                    <p className="text-red-900">{selectedPatient.predictions.riskLevel}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-800">Confidence</p>
                    <p className="text-red-900">{selectedPatient.predictions.confidence.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-800">Last Prediction</p>
                    <p className="text-red-900">{formatTimestamp(selectedPatient.predictions.predictedAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-800">Next Prediction</p>
                    <p className="text-red-900">{formatTimestamp(selectedPatient.predictions.nextPrediction)}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium text-red-800 mb-2">Risk Factors</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPatient.predictions.factors.map((factor, index) => (
                      <span key={index} className="px-3 py-1 bg-red-200 text-red-900 rounded-full text-sm">
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Personal Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Age</p>
                      <p className="text-gray-900">{selectedPatient.personalInfo.age} years old</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Gender</p>
                      <p className="text-gray-900">{selectedPatient.personalInfo.gender}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Admission Date</p>
                      <p className="text-gray-900">{formatTimestamp(selectedPatient.personalInfo.admissionDate)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Location Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Ward</p>
                      <p className="text-gray-900">{selectedPatient.personalInfo.ward}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Room</p>
                      <p className="text-gray-900">
                        {selectedPatient.personalInfo.roomId ? 
                          `Room ${selectedPatient.personalInfo.roomId.split('_')[1] || selectedPatient.personalInfo.roomId}` : 
                          'No room assigned'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Bed</p>
                      <p className="text-gray-900">{selectedPatient.personalInfo.bedId || 'Not assigned'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Status */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Current Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Diagnosis</p>
                    <p className="text-gray-900">{selectedPatient.currentStatus.diagnosis}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Status</p>
                    <p className={`font-medium ${
                      selectedPatient.currentStatus.status === 'critical' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {selectedPatient.currentStatus.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Consciousness</p>
                    <p className="text-gray-900">{selectedPatient.currentStatus.consciousness}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Mobility</p>
                    <p className="text-gray-900">{selectedPatient.currentStatus.mobility}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-600">Last Updated</p>
                  <p className="text-gray-900">{formatTimestamp(selectedPatient.currentStatus.lastUpdated)}</p>
                </div>
              </div>

              {/* Medical History */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Medical History
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Admission Reason</p>
                    <p className="text-gray-900">{selectedPatient.medicalHistory.admissionReason}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Medical Conditions</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedPatient.medicalHistory.conditions.map((condition, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {condition}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Allergies</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedPatient.medicalHistory.allergies.length > 0 ? (
                        selectedPatient.medicalHistory.allergies.map((allergy, index) => (
                          <span key={index} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                            {allergy}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500 text-sm">No known allergies</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-600">Last Checkup</p>
                    <p className="text-gray-900">{formatTimestamp(selectedPatient.medicalHistory.lastCheckup)}</p>
                  </div>
                </div>
              </div>

              {/* Current Medications */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Pill className="h-5 w-5 mr-2" />
                  Current Medications
                </h3>
                <div className="space-y-3">
                  {selectedPatient.medicalHistory.medications.map((medication, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Medication</p>
                          <p className="text-gray-900">{medication.name}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Dosage</p>
                          <p className="text-gray-900">{medication.dosage}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Frequency</p>
                          <p className="text-gray-900">{medication.frequency}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Start Date</p>
                          <p className="text-gray-900">{formatTimestamp(medication.startDate)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closePatientModal}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors duration-200"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200">
                Update Status
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200">
                View Full Chart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthAlerts;