import React, { useState, useEffect } from 'react';
import { useStaff } from '../../../../api/hooks/useStaff';
import { validateApiConfig, checkApiHealth, API_BASE_URL } from '../../../../api/config';
import { Plus, Search, Edit, Trash2, Eye, Calendar, X, Save, User, Phone, Mail, Clock, MapPin } from 'lucide-react';
import { StaffMember } from '../../../../api/staffService';

interface StaffModalState {
  type: 'view' | 'edit' | 'schedule' | 'add' | 'statistics' | null;
  staffId: string | null;
  staffData: StaffMember | null;
}

const StaffManagement: React.FC = () => {
  const {
    staff,
    statistics,
    loading,
    error,
    getStaffMembers,
    createStaff,
    updateStaff,
    deleteStaff,
    getStaffStatistics,
    toggleDutyStatus,
    searchStaff,
  } = useStaff();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filterOnDuty, setFilterOnDuty] = useState<boolean | undefined>(undefined);
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);
  const [modalState, setModalState] = useState<StaffModalState>({
    type: null,
    staffId: null,
    staffData: null
  });

  // Form state for editing/adding staff
  const [formData, setFormData] = useState<StaffMember | null>(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Validate API configuration first
        validateApiConfig();
        console.log('API Base URL:', API_BASE_URL);
        
        // Check if API server is reachable
        const isHealthy = await checkApiHealth();
        setApiHealthy(isHealthy);
        
        if (isHealthy) {
          await getStaffMembers();
          // Temporarily comment out statistics to debug basic staff loading
          // await getStaffStatistics();
        } else {
          console.warn('API server is not reachable');
        }
      } catch (error) {
        console.error('Failed to initialize staff management:', error);
        setApiHealthy(false);
      }
    };
    loadData();
  }, [getStaffMembers, getStaffStatistics]);

  // Handler functions for staff actions
  const handleViewStaff = (staffId: string) => {
    const staffMember = staff[staffId];
    if (staffMember) {
      setModalState({
        type: 'view',
        staffId,
        staffData: staffMember
      });
    }
  };

  const handleEditStaff = (staffId: string) => {
    const staffMember = staff[staffId];
    if (staffMember) {
      setFormData({ ...staffMember });
      setModalState({
        type: 'edit',
        staffId,
        staffData: staffMember
      });
    }
  };

  const handleScheduleStaff = (staffId: string) => {
    const staffMember = staff[staffId];
    if (staffMember) {
      setModalState({
        type: 'schedule',
        staffId,
        staffData: staffMember
      });
    }
  };

  const handleAddStaff = () => {
    const newStaff: StaffMember = {
      personalInfo: {
        name: '',
        role: 'nurse',
        department: '',
        specialization: '',
        contact: {
          email: '',
          phone: ''
        }
      },
      schedule: {},
      currentStatus: {
        onDuty: false,
        location: '',
        lastUpdated: new Date().toISOString(),
        workload: 0
      }
    };
    setFormData(newStaff);
    setModalState({
      type: 'add',
      staffId: null,
      staffData: null
    });
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      const success = await deleteStaff(staffId);
      if (success) {
        // Refresh statistics after deletion
        await getStaffStatistics();
      }
    }
  };

  const handleToggleDuty = async (staffId: string, currentOnDuty: boolean) => {
    const success = await toggleDutyStatus(staffId, !currentOnDuty);
    if (success) {
      await getStaffStatistics();
    }
  };

  const handleCloseModal = () => {
    setModalState({
      type: null,
      staffId: null,
      staffData: null
    });
    setFormData(null);
  };

  const handleSaveStaff = async () => {
    if (!formData) return;

    try {
      let success = false;
      
      if (modalState.type === 'add') {
        const result = await createStaff(formData);
        success = !!result;
      } else if (modalState.type === 'edit' && modalState.staffId) {
        success = await updateStaff(modalState.staffId, formData);
      }
      
      if (success) {
        handleCloseModal();
        await getStaffStatistics();
      }
    } catch (error) {
      console.error('Error saving staff:', error);
    }
  };

  const handleSearch = async () => {
    if (searchTerm) {
      const results = await searchStaff(searchTerm);
      // You might want to show search results in a separate state
      console.log('Search results:', results);
    } else {
      // Reset to show all staff with current filters
      await getStaffMembers({ 
        role: filterRole || undefined, 
        department: filterDepartment || undefined,
        onDuty: filterOnDuty 
      });
    }
  };

  const handleFilter = async () => {
    await getStaffMembers({ 
      role: filterRole || undefined, 
      department: filterDepartment || undefined,
      onDuty: filterOnDuty 
    });
  };

  const updateFormData = (path: string, value: any) => {
    if (!formData) return;
    
    const pathArray = path.split('.');
    const newData = { ...formData };
    let current: any = newData;
    
    for (let i = 0; i < pathArray.length - 1; i++) {
      current = current[pathArray[i]];
    }
    
    current[pathArray[pathArray.length - 1]] = value;
    setFormData(newData);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-600">Loading staff data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="text-lg text-red-600 mb-2">Error: {error}</div>
        {apiHealthy === false && (
          <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
            <p className="font-medium">API Connection Issue</p>
            <p>Backend server at <code>{API_BASE_URL}</code> is not reachable.</p>
            <p>Please make sure the backend server is running.</p>
          </div>
        )}
        <button 
          onClick={() => getStaffMembers()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  const filteredStaff = Object.entries(staff).filter(([_, member]) =>
    member.personalInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.personalInfo.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.personalInfo.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role: StaffMember['personalInfo']['role']) => {
    switch (role) {
      case 'doctor': return 'bg-blue-100 text-blue-800';
      case 'nurse': return 'bg-green-100 text-green-800';
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'technician': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (onDuty: boolean) => {
    return onDuty ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  // Use statistics from API or fallback to calculated values
  const staffCount = statistics?.total_staff ?? Object.keys(staff).length;
  const onDutyCount = statistics?.on_duty_count ?? Object.values(staff).filter(s => s.currentStatus.onDuty).length;
  const doctorCount = statistics?.by_role?.doctor ?? Object.values(staff).filter(s => s.personalInfo.role === 'doctor').length;
  const nurseCount = statistics?.by_role?.nurse ?? Object.values(staff).filter(s => s.personalInfo.role === 'nurse').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
        <button 
          onClick={handleAddStaff}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <Plus className="h-5 w-5" />
          <span>Add Staff</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search staff by name, role, department, or specialization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Search
          </button>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Roles</option>
            <option value="doctor">Doctor</option>
            <option value="nurse">Nurse</option>
            <option value="admin">Admin</option>
            <option value="technician">Technician</option>
          </select>
          
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Departments</option>
            <option value="Emergency">Emergency</option>
            <option value="Cardiology">Cardiology</option>
            <option value="ICU">ICU</option>
            <option value="Pediatrics">Pediatrics</option>
            <option value="Surgery">Surgery</option>
          </select>
          
          <select
            value={filterOnDuty === undefined ? '' : filterOnDuty.toString()}
            onChange={(e) => setFilterOnDuty(e.target.value === '' ? undefined : e.target.value === 'true')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="true">On Duty</option>
            <option value="false">Off Duty</option>
          </select>
          
          <button
            onClick={handleFilter}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
          >
            Apply Filters
          </button>
          
          <button
            onClick={() => {
              setFilterRole('');
              setFilterDepartment('');
              setFilterOnDuty(undefined);
              setSearchTerm('');
              getStaffMembers();
            }}
            className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors duration-200"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Total Staff</h3>
          <p className="text-2xl font-bold text-gray-900">{staffCount}</p>
          {statistics?.average_workload && (
            <p className="text-sm text-gray-500">Avg. workload: {statistics.average_workload.toFixed(1)}%</p>
          )}
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">On Duty</h3>
          <p className="text-2xl font-bold text-green-600">{onDutyCount}</p>
          <p className="text-sm text-gray-500">{Math.round((onDutyCount / staffCount) * 100)}% of total</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Doctors</h3>
          <p className="text-2xl font-bold text-blue-600">{doctorCount}</p>
          <p className="text-sm text-gray-500">{Math.round((doctorCount / staffCount) * 100)}% of staff</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-50" 
             onClick={() => setModalState({ type: 'statistics', staffId: null, staffData: null })}>
          <h3 className="text-sm font-medium text-gray-600">Nurses</h3>
          <p className="text-2xl font-bold text-green-600">{nurseCount}</p>
          <p className="text-sm text-blue-600 hover:text-blue-800">View detailed stats →</p>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workload</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStaff.map(([id, member]) => (
                <tr key={id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{member.personalInfo.name}</div>
                      <div className="text-sm text-gray-500">{member.personalInfo.specialization}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(member.personalInfo.role)}`}>
                      {member.personalInfo.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.personalInfo.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(member.currentStatus.onDuty)}`}>
                      {member.currentStatus.onDuty ? 'On Duty' : 'Off Duty'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${member.currentStatus.workload}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-sm text-gray-600">{member.currentStatus.workload}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{member.personalInfo.contact.email}</div>
                    <div className="text-sm text-gray-500">{member.personalInfo.contact.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => handleViewStaff(id)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleEditStaff(id)}
                        className="text-gray-600 hover:text-gray-900 p-1 rounded-md hover:bg-gray-50"
                        title="Edit Staff"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleScheduleStaff(id)}
                        className="text-green-600 hover:text-green-900 p-1 rounded-md hover:bg-green-50"
                        title="Manage Schedule"
                      >
                        <Calendar className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleToggleDuty(id, member.currentStatus.onDuty)}
                        className={`p-1 rounded-md ${
                          member.currentStatus.onDuty 
                            ? 'text-red-600 hover:text-red-900 hover:bg-red-50' 
                            : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                        }`}
                        title={member.currentStatus.onDuty ? 'Mark Off Duty' : 'Mark On Duty'}
                      >
                        <Clock className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteStaff(id)}
                        className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50"
                        title="Delete Staff"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff View Modal */}
      {modalState.type === 'view' && modalState.staffData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Staff Details</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{modalState.staffData.personalInfo.name}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(modalState.staffData.personalInfo.role)}`}>
                    {modalState.staffData.personalInfo.role}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <span className="text-gray-900">{modalState.staffData.personalInfo.department}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                  <span className="text-gray-900">{modalState.staffData.personalInfo.specialization}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{modalState.staffData.personalInfo.contact.email}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{modalState.staffData.personalInfo.contact.phone}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Current Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(modalState.staffData.currentStatus.onDuty)}`}>
                      {modalState.staffData.currentStatus.onDuty ? 'On Duty' : 'Off Duty'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">{modalState.staffData.currentStatus.location || 'Not specified'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Workload</label>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${modalState.staffData.currentStatus.workload}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{modalState.staffData.currentStatus.workload}%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">
                        {new Date(modalState.staffData.currentStatus.lastUpdated).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staff Edit/Add Modal */}
      {(modalState.type === 'edit' || modalState.type === 'add') && formData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {modalState.type === 'edit' ? 'Edit Staff Member' : 'Add New Staff Member'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.personalInfo.name}
                    onChange={(e) => updateFormData('personalInfo.name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={formData.personalInfo.role}
                    onChange={(e) => updateFormData('personalInfo.role', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="nurse">Nurse</option>
                    <option value="doctor">Doctor</option>
                    <option value="admin">Admin</option>
                    <option value="technician">Technician</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.personalInfo.department}
                    onChange={(e) => updateFormData('personalInfo.department', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                  <input
                    type="text"
                    value={formData.personalInfo.specialization}
                    onChange={(e) => updateFormData('personalInfo.specialization', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.personalInfo.contact.email}
                    onChange={(e) => updateFormData('personalInfo.contact.email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.personalInfo.contact.phone}
                    onChange={(e) => updateFormData('personalInfo.contact.phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Current Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">On Duty</label>
                    <select
                      value={formData.currentStatus.onDuty.toString()}
                      onChange={(e) => updateFormData('currentStatus.onDuty', e.target.value === 'true')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="true">On Duty</option>
                      <option value="false">Off Duty</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={formData.currentStatus.location}
                      onChange={(e) => updateFormData('currentStatus.location', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Workload (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.currentStatus.workload}
                      onChange={(e) => updateFormData('currentStatus.workload', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveStaff}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                >
                  <Save className="h-4 w-4" />
                  <span>{modalState.type === 'edit' ? 'Update' : 'Add'} Staff</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staff Schedule Modal */}
      {modalState.type === 'schedule' && modalState.staffData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Schedule for {modalState.staffData.personalInfo.name}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-7 gap-2">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                  const daySchedule = modalState.staffData!.schedule[day.toLowerCase()];
                  return (
                    <div key={day} className="border border-gray-200 rounded-lg p-3">
                      <h3 className="font-medium text-gray-900 mb-2">{day}</h3>
                      {daySchedule ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span>{daySchedule.shiftStart} - {daySchedule.shiftEnd}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span>{daySchedule.ward}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {daySchedule.shiftType}
                          </div>
                          {daySchedule.patientAssignments.length > 0 && (
                            <div className="text-xs text-blue-600">
                              {daySchedule.patientAssignments.length} patients assigned
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">No schedule</div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Schedule Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900">This Week</h4>
                    <p className="text-2xl font-bold text-blue-600">
                      {Object.keys(modalState.staffData.schedule).length} days
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-900">Current Status</h4>
                    <p className="text-lg font-semibold text-green-600">
                      {modalState.staffData.currentStatus.onDuty ? 'On Duty' : 'Off Duty'}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-medium text-yellow-900">Workload</h4>
                    <p className="text-2xl font-bold text-yellow-600">
                      {modalState.staffData.currentStatus.workload}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Modal */}
      {modalState.type === 'statistics' && statistics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Staff Statistics</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Role Distribution */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Staff by Role</h3>
                <div className="space-y-2">
                  {Object.entries(statistics.by_role).map(([role, count]) => (
                    <div key={role} className="flex justify-between items-center">
                      <span className="capitalize text-gray-700">{role}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(count / statistics.total_staff) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Department Distribution */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Staff by Department</h3>
                <div className="space-y-2">
                  {Object.entries(statistics.by_department).map(([dept, count]) => (
                    <div key={dept} className="flex justify-between items-center">
                      <span className="text-gray-700">{dept}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${(count / statistics.total_staff) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shift Distribution */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Today's Shift Distribution</h3>
                <div className="space-y-2">
                  {Object.entries(statistics.shift_distribution).map(([shift, count]) => (
                    <div key={shift} className="flex justify-between items-center">
                      <span className="capitalize text-gray-700">{shift.replace('-', ' ')}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full" 
                            style={{ width: `${(count / statistics.total_staff) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Metrics */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Key Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900">On Duty Rate</h4>
                    <p className="text-2xl font-bold text-blue-600">
                      {Math.round((statistics.on_duty_count / statistics.total_staff) * 100)}%
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-900">Avg. Workload</h4>
                    <p className="text-2xl font-bold text-green-600">
                      {statistics.average_workload.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;