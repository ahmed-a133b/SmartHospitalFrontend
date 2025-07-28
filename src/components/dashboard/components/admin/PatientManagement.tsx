import React, { useState } from 'react';
import { useHospitalData } from '../../../../contexts/HospitalDataContext';
import { Plus, Search, Edit, Trash2, Eye, AlertCircle } from 'lucide-react';
import PatientForm from './PatientForm';
import { Patient } from '../../../../api/types';



const formatTimestamp = (timestamp: string | undefined | null): string => {
  if (!timestamp) return 'No data available';
  
  try {
    // Debug: log the timestamp being processed
    console.log('Formatting timestamp:', timestamp);
    
    // Handle different timestamp formats
    let date: Date;
    
    // If timestamp contains underscore (backend format: YYYY-MM-DD_HH-MM-SS)
    if (typeof timestamp === 'string' && timestamp.includes('_')) {
      const [datePart, timePart] = timestamp.split('_');
      const [year, month, day] = datePart.split('-');
      const [hour, minute, second] = timePart.split('-');
      date = new Date(
        parseInt(year), 
        parseInt(month) - 1, // Month is 0-indexed in JavaScript
        parseInt(day), 
        parseInt(hour), 
        parseInt(minute), 
        parseInt(second || '0') // Handle cases where seconds might be missing
      );
    } else {
      // Standard ISO format or other formats
      date = new Date(timestamp);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date created from timestamp:', timestamp);
      return 'Invalid date';
    }
    
    // Return formatted date with more readable format
    const result = date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    console.log('Formatted result:', result);
    return result;
  } catch (error) {
    console.error('Error formatting timestamp:', timestamp, error);
    return 'Invalid date format';
  }
};

const PatientManagement: React.FC = () => {
  const { patients, loading, error, refreshData } = useHospitalData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<{ id: string; data: Patient } | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; data: Patient } | null>(null);

  // Debug logging
  console.log('PatientManagement render:', { 
    loading, 
    error, 
    patientsCount: Object.keys(patients || {}).length,
    patients: patients 
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-600">Loading patients...</div>
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

  // Add safety check for patients data
  if (!patients) {
    console.log('Patients data is null/undefined');
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-600">No patient data available...</div>
      </div>
    );
  }

  const filteredPatients = Object.entries(patients).filter(([_, patient]) => {
    try {
      return (
        patient?.personalInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient?.personalInfo?.roomId && patient.personalInfo.roomId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        patient?.currentStatus?.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (err) {
      console.error('Error filtering patient:', patient, err);
      return false;
    }
  });

  const handleEdit = (id: string, patient: Patient) => {
    setEditingPatient({ id, data: patient });
    setShowForm(true);
  };

  const handleView = (id: string, patient: Patient) => {
    setSelectedPatient({ id, data: patient });
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Moderate': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'stable': return 'bg-green-100 text-green-800';
      case 'improving': return 'bg-blue-100 text-blue-800';
      case 'deteriorating': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (showForm) {
    return (
      <PatientForm 
        patientId={editingPatient?.id}
        patient={editingPatient?.data} 
        onClose={() => {
          setShowForm(false);
          setEditingPatient(null);
        }} 
      />
    );
  }

  if (selectedPatient) {
    const { data: patient } = selectedPatient;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedPatient(null)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Patient List
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{patient.personalInfo.name}</h2>
                <p className="text-gray-600">{patient.currentStatus.diagnosis}</p>
              </div>
              <div className="flex space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(patient.currentStatus.status)}`}>
                  {patient.currentStatus.status}
                </span>
                {patient.predictions ? (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskLevelColor(patient.predictions.riskLevel)}`}>
                    {patient.predictions.riskLevel} Risk
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                    No Risk Assessment
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Age</label>
                  <p className="text-gray-900">{patient.personalInfo.age} years old</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Gender</label>
                  <p className="text-gray-900">{patient.personalInfo.gender}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Admission Date</label>
                  <p className="text-gray-900">{formatTimestamp(patient.personalInfo.admissionDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Location</label>
                  <p className="text-gray-900">
                    {patient.personalInfo.ward} - {
                      patient.personalInfo.roomId ? 
                        `Room ${patient.personalInfo.roomId.split('_')[1] || patient.personalInfo.roomId}` : 
                        'No room assigned'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Medical History */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical History</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Conditions</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {patient.medicalHistory.conditions.map((condition, index) => {
                      // Replace underscores with spaces and capitalize first letter
                      const formatted = condition
                        .replace(/_/g, ' ')
                        .replace(/^\w/, c => c.toUpperCase());
                      return (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                          {formatted}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Allergies</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {patient.medicalHistory.allergies.map((allergy, index) => (
                      <span key={index} className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
                        {allergy}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Admission Reason</label>
                  <p className="text-gray-900">{patient.medicalHistory.admissionReason}</p>
                </div>
              </div>
            </div>

            {/* Current Medications */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Medications</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medication</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dosage</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {patient.medicalHistory.medications.map((medication, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {medication.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {medication.dosage}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {medication.frequency}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTimestamp(medication.startDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Risk Assessment</h3>
              {patient.predictions ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Risk Score</label>
                      <p className="text-2xl font-bold text-gray-900">{patient.predictions.riskScore}%</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Confidence</label>
                      <p className="text-2xl font-bold text-gray-900">{Math.round(patient.predictions.confidence * 100)}%</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Last Prediction</label>
                      <p className="text-gray-900">{formatTimestamp(patient.predictions.predictedAt)}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="text-sm font-medium text-gray-600">Risk Factors</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {patient.predictions.factors.map((factor, index) => {
                        const formatted = factor
                          .replace(/_/g, ' ')
                          .replace(/^\w/, c => c.toUpperCase());
                        return (
                          <span key={index} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                            {formatted}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-gray-500">No AI risk assessment available for this patient.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log('Filtered patients count:', filteredPatients.length);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Patient Management</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <Plus className="h-5 w-5" />
          <span>Add Patient</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Search patients by name, room, or diagnosis..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredPatients.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No patients found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diagnosis</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPatients.map(([id, patient]) => {
                  if (!patient || !patient.personalInfo) {
                    console.warn('Invalid patient data:', id, patient);
                    return null;
                  }
                  
                  return (
                    <tr key={id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {patient.personalInfo?.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {patient.personalInfo?.age || 'N/A'} years • {patient.personalInfo?.gender || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {patient.personalInfo?.roomId ? 
                            `Room ${patient.personalInfo.roomId.split('_')[1] || patient.personalInfo.roomId}` : 
                            'No room assigned'
                          }
                        </div>
                        <div className="text-sm text-gray-500">{patient.personalInfo?.ward || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {patient.currentStatus?.diagnosis || 'No diagnosis'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(patient.currentStatus?.status || 'unknown')}`}>
                          {patient.currentStatus?.status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {patient.predictions ? (
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRiskLevelColor(patient.predictions.riskLevel)}`}>
                            {patient.predictions.riskLevel}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">No prediction</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleView(id, patient)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(id, patient)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientManagement;