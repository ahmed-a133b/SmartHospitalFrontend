import React from 'react';
import { useHospitalData } from '../../../../contexts/HospitalDataContext';
import { TrendingUp, TrendingDown, BarChart3, PieChart } from 'lucide-react';

const PatientAnalytics: React.FC = () => {
  const { patients, getCriticalPatients } = useHospitalData();

  // Convert Record to array for calculations
  const patientsArray = Object.values(patients);

  const analytics = {
    totalPatients: patientsArray.length,
    criticalPatients: getCriticalPatients().length,
    averageAge: patientsArray.length > 0 
      ? Math.round(patientsArray.reduce((sum, p) => sum + p.personalInfo.age, 0) / patientsArray.length)
      : 0,
    riskDistribution: patientsArray.reduce((acc, p) => {
      acc[p.predictions.riskLevel] = (acc[p.predictions.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    wardDistribution: patientsArray.reduce((acc, p) => {
      acc[p.personalInfo.ward] = (acc[p.personalInfo.ward] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    statusDistribution: patientsArray.reduce((acc, p) => {
      acc[p.currentStatus.status] = (acc[p.currentStatus.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Patient Analytics</h1>
        <div className="text-sm text-gray-500">
          Data as of {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Patients</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalPatients}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-600" />
          </div>
          <div className="mt-4">
            <span className="text-green-600 text-sm font-medium">
              +12% from last month
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical Cases</p>
              <p className="text-2xl font-bold text-red-600">{analytics.criticalPatients}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-red-600" />
          </div>
          <div className="mt-4">
            <span className="text-red-600 text-sm font-medium">
              {Math.round((analytics.criticalPatients / analytics.totalPatients) * 100)}% of total
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Age</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.averageAge}</p>
            </div>
            <PieChart className="h-8 w-8 text-green-600" />
          </div>
          <div className="mt-4">
            <span className="text-gray-600 text-sm font-medium">
              years old
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recovery Rate</p>
              <p className="text-2xl font-bold text-green-600">87%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
          <div className="mt-4">
            <span className="text-green-600 text-sm font-medium">
              +5% from last quarter
            </span>
          </div>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Level Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Risk Level Distribution</h2>
          <div className="space-y-3">
            {Object.entries(analytics.riskDistribution).map(([risk, count]) => {
              const percentage = Math.round((count / analytics.totalPatients) * 100);
              const colors = {
                Critical: 'bg-red-600',
                High: 'bg-orange-600',
                Moderate: 'bg-yellow-600',
                Low: 'bg-green-600'
              };
              return (
                <div key={risk} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{risk} Risk</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${colors[risk as keyof typeof colors]}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-8">{count}</span>
                    <span className="text-sm text-gray-500 w-8">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ward Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Patients by Ward</h2>
          <div className="space-y-3">
            {Object.entries(analytics.wardDistribution).map(([ward, count]) => {
              const percentage = Math.round((count / analytics.totalPatients) * 100);
              return (
                <div key={ward} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{ward}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-8">{count}</span>
                    <span className="text-sm text-gray-500 w-8">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Patient Status</h2>
          <div className="space-y-3">
            {Object.entries(analytics.statusDistribution).map(([status, count]) => {
              const percentage = Math.round((count / analytics.totalPatients) * 100);
              const colors = {
                stable: 'bg-green-600',
                critical: 'bg-red-600',
                improving: 'bg-blue-600',
                deteriorating: 'bg-orange-600'
              };
              return (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 capitalize">{status}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${colors[status as keyof typeof colors]}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-8">{count}</span>
                    <span className="text-sm text-gray-500 w-8">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trends */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Trends & Insights</h2>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Positive Trend</span>
              </div>
              <p className="text-sm text-green-800 mt-1">
                Recovery rates have improved by 15% this quarter
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Insight</span>
              </div>
              <p className="text-sm text-blue-800 mt-1">
                ICU capacity utilization is at optimal levels (75%)
              </p>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center space-x-2">
                <TrendingDown className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">Alert</span>
              </div>
              <p className="text-sm text-orange-800 mt-1">
                Average length of stay has increased by 2 days
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientAnalytics;