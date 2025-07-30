import React, { useState, useMemo } from 'react';
import { useHospitalData } from '../../../../contexts/HospitalDataContext';
import { TrendingUp, TrendingDown, Activity, Clock, Heart, Thermometer, Droplets, User, ChevronDown, Calendar } from 'lucide-react';

const Analytics: React.FC = () => {
  const { patients, staff, iotDevices, loading, error, refreshAlertsOnly } = useHospitalData();
  const [selectedVital, setSelectedVital] = useState<'heartRate' | 'temperature' | 'oxygenLevel'>('heartRate');
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<'hour' | 'week' | 'month' | 'year'>('hour');

  // Get list of patients for dropdown
  const patientsList = useMemo(() => {
    return Object.entries(patients).map(([patientId, patient]) => {
      // Format room ID: capitalize first letter and remove underscores
      const formatRoomId = (roomId: string) => {
        if (!roomId) return null;
        return roomId.charAt(0).toUpperCase() + roomId.slice(1).replace(/_/g, ' ');
      };

      const formattedRoom = formatRoomId(patient.personalInfo.roomId);
      
      return {
        id: patientId,
        name: patient.personalInfo.name,
        room: formattedRoom,
        rawRoomId: patient.personalInfo.roomId,
        ward: patient.personalInfo.ward
      };
    });
  }, [patients]);

  // Set default selected patient if none selected
  React.useEffect(() => {
    if (!selectedPatient && patientsList.length > 0) {
      setSelectedPatient(patientsList[0].id);
    }
  }, [selectedPatient, patientsList]);

  // Get patient's device data and generate vital trends
  const generatePatientVitalTrends = useMemo(() => {
    if (!selectedPatient) return [];

    const patient = patients[selectedPatient];
    if (!patient) return [];

    const now = new Date();
    let timeRange: Date;
    let dataPointInterval: number;
    let totalDataPoints: number;
    
    // Configure time range and data point intervals based on selected period
    switch (selectedTimePeriod) {
      case 'hour':
        timeRange = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
        dataPointInterval = 5 * 60 * 1000; // 5 minutes
        totalDataPoints = 12; // 12 data points
        break;
      case 'week':
        timeRange = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 1 week ago
        dataPointInterval = 4 * 60 * 60 * 1000; // 4 hours
        totalDataPoints = 42; // 42 data points (7 days * 6 points per day)
        break;
      case 'month':
        timeRange = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 1 month ago
        dataPointInterval = 24 * 60 * 60 * 1000; // 1 day
        totalDataPoints = 30; // 30 data points
        break;
      case 'year':
        timeRange = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
        dataPointInterval = 7 * 24 * 60 * 60 * 1000; // 1 week
        totalDataPoints = 52; // 52 data points
        break;
      default:
        timeRange = new Date(now.getTime() - 60 * 60 * 1000);
        dataPointInterval = 5 * 60 * 1000;
        totalDataPoints = 12;
    }
    
    const dataPoints = [];
    
    // Generate realistic vital trends based on patient's current status
    const patientStatus = patient.currentStatus.status;
    const baseValues = {
      critical: { heartRate: 95, temperature: 99.8, oxygenLevel: 94 },
      stable: { heartRate: 75, temperature: 98.6, oxygenLevel: 98 },
      recovering: { heartRate: 80, temperature: 98.2, oxygenLevel: 97 },
      discharged: { heartRate: 70, temperature: 98.4, oxygenLevel: 99 }
    };

    const base = baseValues[patientStatus as keyof typeof baseValues] || baseValues.stable;
    
    // Generate data points based on the selected time period
    for (let i = 0; i <= totalDataPoints; i++) {
      const timestamp = new Date(timeRange.getTime() + i * dataPointInterval);
      
      // Add realistic variations based on patient condition and time period
      const variationFactor = patientStatus === 'critical' ? 1.5 : patientStatus === 'stable' ? 0.5 : 1.0;
      const timeBasedVariation = selectedTimePeriod === 'year' ? 2.0 : selectedTimePeriod === 'month' ? 1.5 : 1.0;
      
      const vitals = {
        heartRate: base.heartRate + Math.sin(i * 0.5) * 8 * variationFactor * timeBasedVariation + (Math.random() - 0.5) * 10 * variationFactor,
        temperature: base.temperature + Math.sin(i * 0.3) * 0.6 * variationFactor * timeBasedVariation + (Math.random() - 0.5) * 0.8 * variationFactor,
        oxygenLevel: base.oxygenLevel + Math.sin(i * 0.4) * 1.2 * variationFactor * timeBasedVariation + (Math.random() - 0.5) * 1.5 * variationFactor
      };
      
      // Format timestamp based on time period
      let timeLabel: string;
      switch (selectedTimePeriod) {
        case 'hour':
          timeLabel = timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          break;
        case 'week':
          // For week view, show day name and date for better readability
          timeLabel = timestamp.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
          break;
        case 'month':
          timeLabel = timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          break;
        case 'year':
          timeLabel = timestamp.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          break;
        default:
          timeLabel = timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }
      
      dataPoints.push({
        timestamp: timeLabel,
        heartRate: Math.max(50, Math.min(120, Math.round(vitals.heartRate))),
        temperature: Math.max(96, Math.min(102, Math.round(vitals.temperature * 10) / 10)),
        oxygenLevel: Math.max(85, Math.min(100, Math.round(vitals.oxygenLevel * 10) / 10))
      });
    }
    
    return dataPoints;
  }, [selectedPatient, patients, selectedTimePeriod]);

  // Get selected patient info
  const selectedPatientInfo = useMemo(() => {
    return patientsList.find(p => p.id === selectedPatient);
  }, [selectedPatient, patientsList]);

  // Simple Line Chart Component
  const VitalTrendChart: React.FC<{ 
    data: Array<{timestamp: string; heartRate: number; temperature: number; oxygenLevel: number}>; 
    vital: string 
  }> = ({ data, vital }) => {
    const chartWidth = 600;
    const chartHeight = 200;
    const leftPadding = 100; // Increased further to accommodate heart rate labels like "120BPM"
    const rightPadding = 40;
    const topPadding = 40;
    const bottomPadding = 40;
    
    const values = data.map(d => d[vital as keyof typeof d] as number);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;
    
    const points = data.map((point, index) => {
      const x = leftPadding + (index * (chartWidth - leftPadding - rightPadding)) / (data.length - 1);
      const y = chartHeight - bottomPadding - ((point[vital as keyof typeof point] as number - minValue) / range) * (chartHeight - topPadding - bottomPadding);
      return `${x},${y}`;
    }).join(' ');
    
    const getVitalColor = (vitalType: string) => {
      switch (vitalType) {
        case 'heartRate': return '#ef4444';
        case 'temperature': return '#f97316';
        case 'oxygenLevel': return '#3b82f6';
        default: return '#6b7280';
      }
    };
    
    const getVitalUnit = (vitalType: string) => {
      switch (vitalType) {
        case 'heartRate': return ' BPM';
        case 'temperature': return '°F';
        case 'oxygenLevel': return '%';
        default: return '';
      }
    };
    
    return (
      <div className="relative">
        <svg width={chartWidth} height={chartHeight} className="border rounded">
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map(i => (
            <line
              key={i}
              x1={leftPadding}
              y1={topPadding + i * (chartHeight - topPadding - bottomPadding) / 4}
              x2={chartWidth - rightPadding}
              y2={topPadding + i * (chartHeight - topPadding - bottomPadding) / 4}
              stroke="#f3f4f6"
              strokeWidth="1"
            />
          ))}
          
          {/* Chart line */}
          <polyline
            points={points}
            fill="none"
            stroke={getVitalColor(vital)}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          
          {/* Data points */}
          {data.map((point, index) => {
            const x = leftPadding + (index * (chartWidth - leftPadding - rightPadding)) / (data.length - 1);
            const y = chartHeight - bottomPadding - ((point[vital as keyof typeof point] as number - minValue) / range) * (chartHeight - topPadding - bottomPadding);
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill={getVitalColor(vital)}
                className="hover:r-5 transition-all duration-200"
              >
                <title>{`${point.timestamp}: ${point[vital as keyof typeof point]}${getVitalUnit(vital)}`}</title>
              </circle>
            );
          })}
          
          {/* Y-axis labels - Add more intermediate values for better readability */}
          {[0, 1, 2, 3, 4].map((i) => {
            const value = minValue + (i * range) / 4;
            const y = chartHeight - bottomPadding - (i * (chartHeight - topPadding - bottomPadding)) / 4;
            return (
              <text
                key={i}
                x={leftPadding - 20} // Increased spacing further from axis
                y={y + 4} // Center vertically
                textAnchor="end"
                className="text-xs fill-gray-600"
                fontSize="10"
                fontFamily="Arial, sans-serif"
              >
                {Math.round(value * 10) / 10}{getVitalUnit(vital)}
              </text>
            );
          })}
          
          {/* Y-axis line */}
          <line
            x1={leftPadding}
            y1={topPadding}
            x2={leftPadding}
            y2={chartHeight - bottomPadding}
            stroke="#d1d5db"
            strokeWidth="1"
          />
          
          {/* X-axis line */}
          <line
            x1={leftPadding}
            y1={chartHeight - bottomPadding}
            x2={chartWidth - rightPadding}
            y2={chartHeight - bottomPadding}
            stroke="#d1d5db"
            strokeWidth="1"
          />
        </svg>
        
        {/* X-axis labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-600" style={{ paddingLeft: `${leftPadding}px`, paddingRight: `${rightPadding}px` }}>
          {(() => {
            // Show different number of labels based on data length and avoid cluttering
            const dataLength = data.length;
            let labelIndices: number[] = [];
            
            if (dataLength <= 15) {
              // For hour data (12-15 points) - show start, middle, end
              labelIndices = [0, Math.floor(dataLength / 2), dataLength - 1];
            } else if (dataLength <= 25) {
              // For smaller datasets - show 4 points
              labelIndices = [0, Math.floor(dataLength / 3), Math.floor(dataLength * 2 / 3), dataLength - 1];
            } else if (dataLength <= 45) {
              // For week data (around 42 points) - show 5 strategic points
              labelIndices = [0, Math.floor(dataLength / 4), Math.floor(dataLength / 2), Math.floor(dataLength * 3 / 4), dataLength - 1];
            } else {
              // For month/year data - show 6 points max
              labelIndices = [
                0, 
                Math.floor(dataLength / 5), 
                Math.floor(dataLength * 2 / 5), 
                Math.floor(dataLength * 3 / 5), 
                Math.floor(dataLength * 4 / 5), 
                dataLength - 1
              ];
            }
            
            return labelIndices.map((index, i) => (
              <span key={i} className="text-center flex-1">
                {data[index]?.timestamp}
              </span>
            ));
          })()}
        </div>
      </div>
    );
  };

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
          onClick={refreshAlertsOnly}
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

  // Calculate device uptime (commented out since not currently used in UI)
  // const deviceUptime = Object.values(iotDevices).reduce((acc, device) => {
  //   const latestVitals = Object.values(device.vitals)[0];
  //   if (latestVitals?.deviceStatus === 'online') {
  //     acc.online++;
  //   }
  //   acc.total++;
  //   return acc;
  // }, { online: 0, total: 0 });

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
    // {
    //   title: 'Device Uptime',
    //   value: `${Math.round((deviceUptime.online / deviceUptime.total) * 100)}%`,
    //   change: '+2% from yesterday',
    //   changeType: 'positive',
    //   icon: TrendingUp,
    //   color: 'purple'
    // },
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

      {/* Patient Vital Trends */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Patient Vital Trends - Past {selectedTimePeriod === 'hour' ? 'Hour' : 
                                          selectedTimePeriod === 'week' ? 'Week' : 
                                          selectedTimePeriod === 'month' ? 'Month' : 'Year'}
          </h2>
          
          {/* Patient and Time Period Selectors */}
          <div className="flex items-center space-x-4">
            {/* Time Period Selector */}
            <div className="relative flex items-center">
              <Calendar className="absolute left-3 h-4 w-4 text-gray-500 pointer-events-none" />
              <select
                value={selectedTimePeriod}
                onChange={(e) => setSelectedTimePeriod(e.target.value as 'hour' | 'week' | 'month' | 'year')}
                className="appearance-none bg-white border border-gray-300 rounded-lg pl-10 pr-8 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="hour">Past Hour</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
                <option value="year">Past Year</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            </div>
            
            {/* Patient Selector */}
            <div className="relative">
              <select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {patientsList.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} - {patient.room ? `${patient.room}` : 'No room assigned'}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            </div>
            
            {selectedPatientInfo && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{selectedPatientInfo.ward} Ward</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Vital Type Selector */}
        <div className="flex justify-center space-x-2 mb-6">
          {[
            { key: 'heartRate', label: 'Heart Rate', icon: Heart, color: 'text-red-600' },
            { key: 'temperature', label: 'Temperature', icon: Thermometer, color: 'text-orange-600' },
            { key: 'oxygenLevel', label: 'Oxygen Level', icon: Droplets, color: 'text-blue-600' }
          ].map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => setSelectedVital(key as 'heartRate' | 'temperature' | 'oxygenLevel')}
              className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                selectedVital === key
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className={`h-4 w-4 ${selectedVital === key ? 'text-blue-600' : color}`} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        
        <div className="flex justify-center">
          <VitalTrendChart data={generatePatientVitalTrends} vital={selectedVital} />
        </div>
        
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-500">Average</p>
            <p className="text-lg font-semibold text-gray-900">
              {generatePatientVitalTrends.length > 0 
                ? Math.round(generatePatientVitalTrends.reduce((sum: number, point) => sum + point[selectedVital], 0) / generatePatientVitalTrends.length * 10) / 10
                : 0}
              {selectedVital === 'heartRate' ? ' BPM' : selectedVital === 'temperature' ? '°F' : '%'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Peak</p>
            <p className="text-lg font-semibold text-gray-900">
              {generatePatientVitalTrends.length > 0 
                ? Math.max(...generatePatientVitalTrends.map(point => point[selectedVital]))
                : 0}
              {selectedVital === 'heartRate' ? ' BPM' : selectedVital === 'temperature' ? '°F' : '%'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Low</p>
            <p className="text-lg font-semibold text-gray-900">
              {generatePatientVitalTrends.length > 0 
                ? Math.min(...generatePatientVitalTrends.map(point => point[selectedVital]))
                : 0}
              {selectedVital === 'heartRate' ? ' BPM' : selectedVital === 'temperature' ? '°F' : '%'}
            </p>
          </div>
        </div>
        
        {/* Patient Status Indicator */}
        {selectedPatient && patients[selectedPatient] && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Patient Status:</span>
              <span className={`font-medium px-2 py-1 rounded-full text-xs ${
                patients[selectedPatient].currentStatus.status === 'critical' 
                  ? 'bg-red-100 text-red-800'
                  : patients[selectedPatient].currentStatus.status === 'stable'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {patients[selectedPatient].currentStatus.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-gray-600">Diagnosis:</span>
              <span className="font-medium">{patients[selectedPatient].currentStatus.diagnosis}</span>
            </div>
          </div>
        )}
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