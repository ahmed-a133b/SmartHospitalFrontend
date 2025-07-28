import React, { useState } from 'react';
import { useHospitalData } from '../../../../contexts/HospitalDataContext';
import { X, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Patient } from '../../../../api/types';

interface PatientFormProps {
  patientId?: string;
  patient?: Patient | null;
  onClose: () => void;
}

// Helper function to format dates to match backend format
const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) {
    date = new Date();
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
};

// Helper function to format date for input type="date"
const formatDateForInput = (dateStr: string | null | undefined): string => {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  try {
    // If the date is already in backend format (YYYY-MM-DD_HH-MM-SS)
    if (dateStr.includes('_')) {
      const [datePart] = dateStr.split('_');
      return datePart;
    }
    // If the date is in ISO format or other format
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  } catch (e) {
    console.error('Error parsing date:', dateStr, e);
    return new Date().toISOString().split('T')[0];
  }
};

// Helper function to ensure medication array is valid
const sanitizeMedications = (medications: any[] | null | undefined) => {
  if (!medications || !Array.isArray(medications)) return [];
  return medications.map(med => ({
    name: med?.name || '',
    dosage: med?.dosage || '',
    frequency: med?.frequency || '',
    startDate: formatDateForInput(med?.startDate)
  }));
};

interface ValidationErrors {
  [key: string]: string[];
}

const PatientForm: React.FC<PatientFormProps> = ({ patientId, patient, onClose }) => {
  const { addPatient, updatePatient } = useHospitalData();
  const isEditing = !!patient;
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    personalInfo: {
      name: patient?.personalInfo?.name || '',
      age: patient?.personalInfo?.age || 0,
      gender: patient?.personalInfo?.gender || '',
      admissionDate: formatDateForInput(patient?.personalInfo?.admissionDate),
      ward: patient?.personalInfo?.ward || '',
      roomId: patient?.personalInfo?.roomId || '',
      bedId: patient?.personalInfo?.bedId || ''
    },
    medicalHistory: {
      conditions: patient?.medicalHistory?.conditions || [],
      medications: sanitizeMedications(patient?.medicalHistory?.medications),
      allergies: patient?.medicalHistory?.allergies || [],
      lastCheckup: formatDateForInput(patient?.medicalHistory?.lastCheckup),
      admissionReason: patient?.medicalHistory?.admissionReason || ''
    },
    currentStatus: {
      diagnosis: patient?.currentStatus?.diagnosis || '',
      status: patient?.currentStatus?.status || 'stable',
      consciousness: patient?.currentStatus?.consciousness || 'awake',
      mobility: patient?.currentStatus?.mobility || 'mobile',
      lastUpdated: formatDate(new Date())
    },
    predictions: {
      riskLevel: patient?.predictions?.riskLevel || 'Low',
      riskScore: patient?.predictions?.riskScore || 25,
      confidence: patient?.predictions?.confidence || 0.85,
      predictedAt: formatDate(new Date()),
      nextPrediction: formatDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      factors: patient?.predictions?.factors || []
    }
  });

  const [newCondition, setNewCondition] = useState('');
  const [newAllergy, setNewAllergy] = useState('');
  const [newFactor, setNewFactor] = useState('');
  const [newMedication, setNewMedication] = useState({
    name: '',
    dosage: '',
    frequency: '',
    startDate: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});
    setIsSubmitting(true);
    
    try {
      // Format dates before sending to backend
      const formattedData = {
        ...formData,
        personalInfo: {
          ...formData.personalInfo,
          admissionDate: formatDate(formData.personalInfo.admissionDate)
        },
        medicalHistory: {
          ...formData.medicalHistory,
          medications: formData.medicalHistory.medications.map(med => ({
            ...med,
            startDate: formatDate(med.startDate)
          })),
          lastCheckup: formatDate(formData.medicalHistory.lastCheckup)
        },
        currentStatus: {
          ...formData.currentStatus,
          lastUpdated: formatDate(new Date())
        },
        predictions: {
          ...formData.predictions,
          predictedAt: formatDate(new Date()),
          nextPrediction: formatDate(new Date(Date.now() + 24 * 60 * 60 * 1000))
        }
      } as Patient;
      
      const result = isEditing && patientId 
        ? await updatePatient(patientId, formattedData)
        : await addPatient(formattedData);

      if (!result.success) {
        if (result.errors?.validationErrors) {
          setValidationErrors(result.errors.validationErrors);
          throw new Error('Please fix the validation errors below.');
        } else {
          throw new Error(result.errors?.message || 'Failed to save patient data. Please try again.');
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Error submitting patient form:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addCondition = () => {
    if (newCondition.trim()) {
      setFormData(prev => ({
        ...prev,
        medicalHistory: {
          ...prev.medicalHistory,
          conditions: [...prev.medicalHistory.conditions, newCondition.trim()]
        }
      }));
      setNewCondition('');
    }
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      medicalHistory: {
        ...prev.medicalHistory,
        conditions: prev.medicalHistory.conditions.filter((_, i) => i !== index)
      }
    }));
  };

  const addAllergy = () => {
    if (newAllergy.trim()) {
      setFormData(prev => ({
        ...prev,
        medicalHistory: {
          ...prev.medicalHistory,
          allergies: [...prev.medicalHistory.allergies, newAllergy.trim()]
        }
      }));
      setNewAllergy('');
    }
  };

  const removeAllergy = (index: number) => {
    setFormData(prev => ({
      ...prev,
      medicalHistory: {
        ...prev.medicalHistory,
        allergies: prev.medicalHistory.allergies.filter((_, i) => i !== index)
      }
    }));
  };

  const addMedication = () => {
    if (newMedication.name.trim()) {
      setFormData(prev => ({
        ...prev,
        medicalHistory: {
          ...prev.medicalHistory,
          medications: [...prev.medicalHistory.medications, newMedication]
        }
      }));
      setNewMedication({
        name: '',
        dosage: '',
        frequency: '',
        startDate: new Date().toISOString().split('T')[0]
      });
    }
  };

  const removeMedication = (index: number) => {
    setFormData(prev => ({
      ...prev,
      medicalHistory: {
        ...prev.medicalHistory,
        medications: prev.medicalHistory.medications.filter((_, i) => i !== index)
      }
    }));
  };

  const addFactor = () => {
    if (newFactor.trim()) {
      setFormData(prev => ({
        ...prev,
        predictions: {
          ...prev.predictions,
          factors: [...prev.predictions.factors, newFactor.trim()]
        }
      }));
      setNewFactor('');
    }
  };

  const removeFactor = (index: number) => {
    setFormData(prev => ({
      ...prev,
      predictions: {
        ...prev.predictions,
        factors: prev.predictions.factors.filter((_, i) => i !== index)
      }
    }));
  };

  const getFieldError = (field: string): string | null => {
    if (validationErrors[field]) {
      return validationErrors[field][0];
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Patient' : 'Add New Patient'}
        </h1>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
          disabled={isSubmitting}
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="ml-3 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
                {getFieldError('personalInfo.name') && (
                  <span className="text-red-500 text-xs ml-1">
                    {getFieldError('personalInfo.name')}
                  </span>
                )}
              </label>
              <input
                type="text"
                required
                value={formData.personalInfo.name}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, name: e.target.value }
                }))}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  getFieldError('personalInfo.name') ? 'border-red-300' : 'border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <input
                type="number"
                required
                min="0"
                max="150"
                value={formData.personalInfo.age}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, age: parseInt(e.target.value) }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                required
                value={formData.personalInfo.gender}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, gender: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admission Date</label>
              <input
                type="date"
                required
                value={formatDateForInput(formData.personalInfo.admissionDate)}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, admissionDate: formatDate(new Date(e.target.value)) }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
              <select
                required
                value={formData.personalInfo.ward}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, ward: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Ward</option>
                <option value="ICU">ICU</option>
                <option value="Emergency">Emergency</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Neurology">Neurology</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Surgery">Surgery</option>
                <option value="Maternity">Maternity</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room ID (Optional)</label>
              <input
                type="text"
                value={formData.personalInfo.roomId}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, roomId: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., room-101 (leave empty if not assigned)"
              />
            </div>
          </div>
        </div>

        {/* Medical History */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Medical History</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admission Reason</label>
              <textarea
                required
                value={formData.medicalHistory.admissionReason}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  medicalHistory: { ...prev.medicalHistory, admissionReason: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>

            {/* Conditions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medical Conditions</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.medicalHistory.conditions.map((condition, index) => (
                  <span key={index} className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    <span>{condition}</span>
                    <button
                      type="button"
                      onClick={() => removeCondition(index)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  placeholder="Add medical condition"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={addCondition}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Allergies */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.medicalHistory.allergies.map((allergy, index) => (
                  <span key={index} className="flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                    <span>{allergy}</span>
                    <button
                      type="button"
                      onClick={() => removeAllergy(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  placeholder="Add allergy"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={addAllergy}
                  className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Current Status */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
              <input
                type="text"
                required
                value={formData.currentStatus.diagnosis}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  currentStatus: { ...prev.currentStatus, diagnosis: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                required
                value={formData.currentStatus.status}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  currentStatus: { ...prev.currentStatus, status: e.target.value as any }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="stable">Stable</option>
                <option value="critical">Critical</option>
                <option value="improving">Improving</option>
                <option value="deteriorating">Deteriorating</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Consciousness</label>
              <select
                required
                value={formData.currentStatus.consciousness}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  currentStatus: { ...prev.currentStatus, consciousness: e.target.value as any }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="awake">Awake</option>
                <option value="sedated">Sedated</option>
                <option value="unconscious">Unconscious</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobility</label>
              <select
                required
                value={formData.currentStatus.mobility}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  currentStatus: { ...prev.currentStatus, mobility: e.target.value as any }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="mobile">Mobile</option>
                <option value="restricted">Restricted</option>
                <option value="bedbound">Bedbound</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{isEditing ? 'Updating...' : 'Creating...'}</span>
              </>
            ) : (
              <span>{isEditing ? 'Update Patient' : 'Add Patient'}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientForm;