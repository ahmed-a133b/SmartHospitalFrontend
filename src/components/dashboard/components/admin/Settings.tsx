import React, { useState } from 'react';
import { Settings as SettingsIcon, Bell, Shield, Database, Monitor } from 'lucide-react';

const Settings: React.FC = () => {
  const [notifications, setNotifications] = useState({
    criticalAlerts: true,
    systemUpdates: true,
    dailyReports: false,
    maintenanceReminders: true
  });

  const [systemSettings, setSystemSettings] = useState({
    autoBackup: true,
    dataRetention: '365',
    alertThreshold: 'medium',
    updateFrequency: '5'
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <SettingsIcon className="h-8 w-8 text-gray-700" />
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
      </div>

      {/* Notification Settings */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-3 mb-4">
          <Bell className="h-6 w-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>
        </div>
        <div className="space-y-4">
          {Object.entries(notifications).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </label>
              <button
                onClick={() => setNotifications(prev => ({ ...prev, [key]: !value }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  value ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    value ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* System Configuration */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-3 mb-4">
          <Database className="h-6 w-6 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">System Configuration</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Retention (days)</label>
            <input
              type="number"
              value={systemSettings.dataRetention}
              onChange={(e) => setSystemSettings(prev => ({ ...prev, dataRetention: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Update Frequency (minutes)</label>
            <input
              type="number"
              value={systemSettings.updateFrequency}
              onChange={(e) => setSystemSettings(prev => ({ ...prev, updateFrequency: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alert Threshold</label>
            <select
              value={systemSettings.alertThreshold}
              onChange={(e) => setSystemSettings(prev => ({ ...prev, alertThreshold: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="flex items-center">
            <label className="text-sm font-medium text-gray-700">Auto Backup</label>
            <button
              onClick={() => setSystemSettings(prev => ({ ...prev, autoBackup: !prev.autoBackup }))}
              className={`ml-auto relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                systemSettings.autoBackup ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  systemSettings.autoBackup ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="h-6 w-6 text-red-600" />
          <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session Timeout (minutes)</label>
            <input
              type="number"
              defaultValue="30"
              className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Two-Factor Authentication</label>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200">
              Enable
            </button>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Audit Logging</label>
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              Enabled
            </span>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200">
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default Settings;