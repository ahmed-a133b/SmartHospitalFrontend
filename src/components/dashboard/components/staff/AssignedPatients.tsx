import React from 'react';
import { Patient } from '../../../../api/types';
import { Heart, Clock, AlertTriangle, Activity } from 'lucide-react';

interface AssignedPatientsProps {
  patients: Record<string, Patient>;
}

const AssignedPatients: React.FC<AssignedPatientsProps> = ({ patients }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'stable': return 'bg-green-100 text-green-800';
      case 'improving': return 'bg-blue-100 text-blue-800';
      case 'deteriorating': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'High': return 'text-red-600';
      case 'Moderate': return 'text-yellow-600';
      case 'Low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const patientList = Object.entries(patients);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Assigned Patients</h1>
        <div className="text-sm text-gray-500">
          {patientList.length} patients under your care
        </div>
      </div>

      {/* Patient List */}
      <div className="grid grid-cols-1 gap-6">
        {patientList.map(([id, patient]) => (
          <div key={id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{patient.personalInfo.name}</h3>
                  <p className="text-sm text-gray-600">
                    {patient.personalInfo.age} years • {patient.personalInfo.gender}
                  </p>
                  <p className="text-sm text-gray-600">
                    Room {patient.personalInfo.roomId} • Bed {patient.personalInfo.bedId}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.currentStatus.status)}`}>
                  {patient.currentStatus.status.charAt(0).toUpperCase() + patient.currentStatus.status.slice(1)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Current Status</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Heart className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="text-sm text-gray-900">{patient.currentStatus.diagnosis}</p>
                          <p className="text-xs text-gray-600">Diagnosis</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Activity className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-900">{patient.currentStatus.consciousness}</p>
                          <p className="text-xs text-gray-600">Consciousness</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="text-sm text-gray-900">
                            {new Date(patient.currentStatus.lastUpdated).toLocaleTimeString()}
                          </p>
                          <p className="text-xs text-gray-600">Last Updated</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Medical History</h4>
                    <div className="space-y-2">
                      {patient.medicalHistory.conditions.map((condition, index) => (
                        <span 
                          key={index}
                          className="inline-block px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full mr-2 mb-2"
                        >
                          {condition}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {patient.predictions && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Risk Assessment</h4>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">Risk Level</span>
                          <span className={`text-sm font-bold ${getRiskLevelColor(patient.predictions.riskLevel)}`}>
                            {patient.predictions.riskLevel}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full mb-2">
                          <div 
                            className="h-2 bg-blue-500 rounded-full"
                            style={{ width: `${patient.predictions.riskScore}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-600">
                          {patient.predictions.confidence * 100}% confidence
                        </p>
                      </div>
                    </div>
                  )}

                  {patient.medicalHistory.medications.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Current Medications</h4>
                      <div className="space-y-2">
                        {patient.medicalHistory.medications.map((medication, index) => (
                          <div key={index} className="p-2 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium text-blue-900">{medication.name}</p>
                            <p className="text-xs text-blue-700">
                              {medication.dosage} • {medication.frequency}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {patientList.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Assigned Patients</h3>
          <p className="text-gray-600 mt-2">You currently have no patients assigned to your care.</p>
        </div>
      )}
    </div>
  );
};

export default AssignedPatients;