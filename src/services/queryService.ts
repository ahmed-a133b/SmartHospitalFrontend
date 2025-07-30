import { 
  fetchPatientsByStatus, 
  fetchAlerts,
  fetchPatientRecord,
  fetchPatientVitals,
  fetchMonitorVitals,
  fetchEnvironmentalData,
  fetchHealthRiskPrediction,
  fetchRoomOccupancy,
  fetchRoomAlerts,
  searchPatientsByName
} from './apiService';

interface QueryResponse {
  message: string;
  data?: any;
}

// Helper function to format patient data for display
const formatPatientData = (patients: any[]): string => {
  if (patients.length === 0) {
    return "No patients found matching your criteria.";
  }
  
  return patients.slice(0, 5).map((patient, index) => {
    const roomInfo = patient.personalInfo?.roomId?.replace('room_', '') || patient.roomNumber;
    const bedInfo = patient.personalInfo?.bedId?.replace('bed_', '') || patient.bedNumber;
    
    return `${index + 1}. **${patient.personalInfo?.name || patient.name || 'Unknown'}**
   • Status: ${patient.currentStatus?.status || patient.status || 'Unknown'}
   • Location: Room ${roomInfo || 'Unassigned'}${bedInfo ? `, Bed ${bedInfo}` : ''}
   • Age: ${patient.personalInfo?.age || 'Unknown'}`;
  }).join('\n\n') + (patients.length > 5 ? `\n\n...and ${patients.length - 5} more patients` : '');
};

// Helper function to format timestamp
const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return 'Unknown';
  
  try {
    let date: Date;
    
    // Handle backend timestamp format like "2025-07-30_12-11-06"
    if (typeof timestamp === 'string' && timestamp.includes('_')) {
      // Convert "2025-07-30_12-11-06" to ISO format "2025-07-30T12:11:06"
      const isoFormat = timestamp.replace('_', 'T').replace(/-(\d{2})-(\d{2})$/, ':$1:$2');
      date = new Date(isoFormat);
    } else {
      date = new Date(timestamp);
    }
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp:', timestamp);
      return 'Invalid Date';
    }
    
    return date.toLocaleString();
  } catch (error) {
    console.warn('Error formatting timestamp:', timestamp, error);
    return 'Unknown';
  }
};

// Helper function to format vital signs
const formatVitalSigns = (vitals: any): string => {
  if (!vitals) {
    return "No vital signs data available.";
  }
  
  const bp = vitals.bloodPressure;
  const bpString = bp && typeof bp === 'object' 
    ? `${bp.systolic}/${bp.diastolic}` 
    : vitals.bloodPressure || 'N/A';
  
  return `**📊 Latest Vital Signs:**
• ❤️ Heart Rate: ${vitals.heartRate || 'N/A'} bpm
• 🩸 Blood Pressure: ${bpString} mmHg
• 🌡️ Temperature: ${vitals.temperature ? vitals.temperature.toFixed(1) : 'N/A'}°C
• 🫁 Oxygen Level: ${vitals.oxygenLevel ? vitals.oxygenLevel.toFixed(1) : 'N/A'}%
${vitals.respiratoryRate ? `• 💨 Respiratory Rate: ${vitals.respiratoryRate} breaths/min` : ''}
• ⏰ Last Updated: ${formatTimestamp(vitals.timestamp)}`;
};

// Helper function to format environmental data
const formatEnvironmentalData = (envData: any): string => {
  if (!envData) {
    return "No environmental data available for this room.";
  }
  
  console.log('Formatting environmental data:', envData);
  
  // Helper function to safely format numbers
  const formatValue = (value: any, decimals: number = 1, fallback: string = 'N/A'): string => {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'number' && !isNaN(value)) {
      return decimals === 0 ? value.toFixed(0) : value.toFixed(decimals);
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        return decimals === 0 ? parsed.toFixed(0) : parsed.toFixed(decimals);
      }
    }
    return fallback;
  };
  
  return `**🌡️ Environmental Conditions:**
• Temperature: ${formatValue(envData.temperature)}°C
• Humidity: ${formatValue(envData.humidity)}%
• Air Quality: ${formatValue(envData.airQuality)}
• CO₂ Level: ${formatValue(envData.co2Level, 0)} ppm
• Light Level: ${formatValue(envData.lightLevel, 0)} lux
• Noise Level: ${formatValue(envData.noiseLevel)} dB
• Last Updated: ${formatTimestamp(envData.timestamp)}`;
};

// Helper function to format room occupancy
const formatRoomOccupancy = (rooms: any[]): string => {
  if (rooms.length === 0) {
    return "No room occupancy data available.";
  }
  
  return rooms.slice(0, 10).map((room, index) => {
    const roomNum = room.roomId?.replace('room_', '') || room.number || 'Unknown';
    const occupancyRate = room.totalBeds > 0 ? ((room.occupiedBeds / room.totalBeds) * 100).toFixed(0) : '0';
    const statusIcon = room.isOccupied ? '🔴' : '🟢';
    
    let patientsInfo = '';
    if (room.patients && room.patients.length > 0) {
      patientsInfo = '\n   • Patients: ' + room.patients.map((p: any) => 
        `${p.name} (Bed ${p.bedId?.replace('bed_', '') || 'Unknown'})`
      ).join(', ');
    }
    
    return `${index + 1}. ${statusIcon} **Room ${roomNum}** (${room.roomType || room.type || 'Standard'})
   • Status: ${room.isOccupied ? 'Occupied' : 'Available'}
   • Occupancy: ${room.occupiedBeds || 0}/${room.totalBeds || 0} beds (${occupancyRate}%)${patientsInfo}`;
  }).join('\n\n') + (rooms.length > 10 ? `\n\n...and ${rooms.length - 10} more rooms` : '');
};

// Helper function to format alerts
const formatAlerts = (alerts: any[]): string => {
  if (alerts.length === 0) {
    return "No alerts found.";
  }
  
  return alerts.slice(0, 8).map((alert, index) => {
    const priority = alert.priority || alert.severity_level || alert.severity || 'medium';
    const priorityEmoji = priority === 'high' || priority === 'critical' ? '🚨' : 
                         priority === 'medium' ? '⚠️' : 'ℹ️';
    const timeAgo = getTimeAgo(alert.timestamp);
    const roomNum = alert.roomNumber || alert.room_id || (alert.deviceId ? alert.deviceId.replace('monitor_', '') : 'Unknown');
    
    return `${index + 1}. ${priorityEmoji} **${priority.toUpperCase()}** - Room ${roomNum}
   • ${alert.message || alert.description || 'No description'}
   • ${timeAgo}${alert.acknowledged ? ' ✅' : ' ⏳'}`;
  }).join('\n\n') + (alerts.length > 8 ? `\n\n...and ${alerts.length - 8} more alerts` : '');
};

// Helper function to calculate time ago
const getTimeAgo = (timestamp: string): string => {
  if (!timestamp) return 'Unknown time';
  
  try {
    const now = new Date();
    let alertTime: Date;
    
    // Handle different timestamp formats
    if (typeof timestamp === 'string' && timestamp.includes('_')) {
      // Handle format like "2025-07-30_11-48-54"
      const isoFormat = timestamp.replace('_', 'T').replace(/-(\d{2})-(\d{2})$/, ':$1:$2');
      alertTime = new Date(isoFormat);
    } else {
      alertTime = new Date(timestamp);
    }
    
    // Check if date is valid
    if (isNaN(alertTime.getTime())) {
      console.warn('Invalid timestamp:', timestamp);
      return 'Unknown time';
    }
    
    const diffMs = now.getTime() - alertTime.getTime();
    
    // Handle future dates (shouldn't happen but just in case)
    if (diffMs < 0) {
      return 'Just now';
    }
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) return `${diffWeeks}w ago`;
    
    return alertTime.toLocaleDateString();
  } catch (error) {
    console.warn('Error calculating time ago for timestamp:', timestamp, error);
    return 'Unknown time';
  }
};

// Helper function to format conditions (remove underscores and capitalize)
const formatConditions = (conditions: string[]): string => {
  if (!conditions || conditions.length === 0) {
    return 'None listed';
  }
  
  return conditions.map(condition => {
    // Replace underscores with spaces and capitalize words
    return condition
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }).join(', ');
};

// Helper function to format backend timestamp to readable date
const formatBackendDate = (timestamp: string): string => {
  if (!timestamp) {
    return 'Unknown';
  }
  
  try {
    // Handle backend timestamp format like "2025-07-18_05-00-00"
    let isoFormat = timestamp;
    if (timestamp.includes('_')) {
      // Convert "2025-07-18_05-00-00" to "2025-07-18T05:00:00"
      isoFormat = timestamp.replace('_', 'T').replace(/-(\d{2})-(\d{2})$/, ':$1:$2');
    }
    
    const date = new Date(isoFormat);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    }
    
    return 'Unknown';
  } catch (error) {
    console.warn('Error formatting date:', timestamp, error);
    return 'Unknown';
  }
};

// Helper function to format patient record
const formatPatientRecord = (patient: any): string => {
  const personalInfo = patient.personalInfo || {};
  const medicalHistory = patient.medicalHistory || {};
  const currentStatus = patient.currentStatus || {};
  
  return `**👤 Patient Record: ${personalInfo.name || 'Unknown'}**

**📋 Personal Information:**
• Age: ${personalInfo.age || 'Unknown'} years
• Gender: ${personalInfo.gender || 'Unknown'}
• Location: Room ${personalInfo.roomId?.replace('room_', '') || 'Unassigned'}${personalInfo.bedId ? `, Bed ${personalInfo.bedId.replace('bed_', '')}` : ''}

**🏥 Medical Information:**
• Current Status: ${currentStatus.status || 'Unknown'}
• Admission Date: ${formatBackendDate(currentStatus.admissionDate)}
• Conditions: ${formatConditions(medicalHistory.conditions)}
• Allergies: ${medicalHistory.allergies?.length ? medicalHistory.allergies.join(', ') : 'None listed'}
• Current Medications: ${medicalHistory.medications?.length ? medicalHistory.medications.map((m: any) => m.name || m).join(', ') : 'None listed'}`;
};

// Helper function to format health risk prediction
const formatHealthRiskPrediction = (risk: any): string => {
  if (!risk) {
    return "No health risk assessment available.";
  }
  
  console.log('Formatting risk prediction data:', risk);
  
  const riskLevel = risk.riskLevel || risk.risk_level || 'unknown';
  const riskScore = risk.riskScore || risk.risk_score || risk.confidence;
  const predictedConditions = risk.factors || risk.predictedConditions || risk.predicted_conditions || [];
  const recommendations = risk.recommendations || [];
  
  const riskEmoji = riskLevel.toLowerCase() === 'critical' ? '🔴' : 
                   riskLevel.toLowerCase() === 'high' ? '🟠' : 
                   riskLevel.toLowerCase() === 'moderate' || riskLevel.toLowerCase() === 'medium' ? '🟡' : '🟢';
  
  let formattedRiskScore = 'N/A';
  if (riskScore !== undefined && riskScore !== null && riskScore !== 0) {
    if (typeof riskScore === 'number') {
      // If risk score is between 0-1, treat as decimal percentage
      if (riskScore <= 1) {
        formattedRiskScore = `${(riskScore * 100).toFixed(1)}%`;
      } 
      // If risk score is > 1 and <= 100, treat as percentage
      else if (riskScore <= 100) {
        formattedRiskScore = `${riskScore.toFixed(1)}%`;
      }
      // If risk score is > 100, just show the number
      else {
        formattedRiskScore = riskScore.toString();
      }
    } else {
      formattedRiskScore = riskScore.toString();
    }
  }
  
  const formattedConditions = Array.isArray(predictedConditions) && predictedConditions.length > 0 
    ? predictedConditions.join(', ') 
    : 'None identified';
  
  const formattedRecommendations = Array.isArray(recommendations) && recommendations.length > 0 
    ? recommendations.join(', ') 
    : 'Continue monitoring';
  
  // Format date
  let formattedDate = 'Unknown';
  if (risk.predictedAt || risk.lastAssessment || risk.timestamp) {
    try {
      const dateStr = risk.predictedAt || risk.lastAssessment || risk.timestamp;
      if (typeof dateStr === 'string' && dateStr.includes('_')) {
        // Handle format like "2025-07-30_11-48-54"
        const isoFormat = dateStr.replace('_', 'T').replace(/-(\d{2})-(\d{2})$/, ':$1:$2');
        formattedDate = new Date(isoFormat).toLocaleString();
      } else {
        formattedDate = new Date(dateStr).toLocaleString();
      }
    } catch (error) {
      console.warn('Date parsing error:', error);
      formattedDate = risk.predictedAt || risk.lastAssessment || risk.timestamp;
    }
  }
  
  return `**🎯 Health Risk Assessment**

${riskEmoji} **Risk Level: ${riskLevel.toUpperCase()}**
• Risk Score: ${formattedRiskScore}
• Predicted Conditions: ${formattedConditions}
• Recommendations: ${formattedRecommendations}
• Assessment Date: ${formattedDate}`;
};

// Enhanced query processing with better pattern matching
export const processChatQuery = async (query: string): Promise<QueryResponse> => {
  try {
    // Extract patient name or ID from query
    const extractPatientInfo = (query: string) => {
      // Try to extract patient name (improved patterns)
      // Pattern 1: "show patient record for [Name]"
      const recordNameMatch = query.match(/(?:show|get|find)\s+patient\s+record\s+for\s+([A-Za-z][A-Za-z\s]{2,})(?:\s|$|,|\.)/i);
      if (recordNameMatch && recordNameMatch[1] && !recordNameMatch[1].match(/^\d+$/)) {
        return { type: 'name', value: recordNameMatch[1].trim() };
      }
      
      // Pattern 2: "patient [Name]" or "for [Name]" or "of [Name]"
      const nameMatch = query.match(/(?:patient|for|of)\s+(?:named\s+)?["']?([A-Za-z][A-Za-z\s]{2,})["']?(?:\s|$|,|\.)/i);
      if (nameMatch && nameMatch[1] && !nameMatch[1].match(/^\d+$/) && !nameMatch[1].toLowerCase().includes('patient') && !nameMatch[1].toLowerCase().includes('record')) {
        return { type: 'name', value: nameMatch[1].trim() };
      }
      
      // Try to extract patient ID - improved patterns to be more specific
      // Pattern 1: "patient 2", "patient 1", etc.
      const simpleIdMatch = query.match(/\bpatient\s+(\d+)\b/i);
      if (simpleIdMatch) {
        return { type: 'id', value: simpleIdMatch[1] };
      }
      
      // Pattern 2: "patient P1001", "patient_1", etc.
      const formattedIdMatch = query.match(/\bpatient\s+(P\d+|patient_\d+)\b/i);
      if (formattedIdMatch) {
        return { type: 'id', value: formattedIdMatch[1] };
      }
      
      // Pattern 3: For general patient ID patterns (only if no "record" or other keywords nearby)
      if (!query.toLowerCase().includes('record')) {
        const generalIdMatch = query.match(/\bpatient\s+([\w-]+)\b/i);
        if (generalIdMatch && generalIdMatch[1] && !generalIdMatch[1].toLowerCase().includes('record')) {
          return { type: 'id', value: generalIdMatch[1] };
        }
      }
      
      return null;
    };
    
    // Extract room number from query
    const extractRoomNumber = (query: string) => {
      const roomMatch = query.match(/room\s+(\d+)/i);
      return roomMatch ? roomMatch[1] : null;
    };
    
    // Patient status queries
    if (/critical\s+patient|patient.*critical|show.*critical/i.test(query)) {
      const patients = await fetchPatientsByStatus('critical');
      return {
        message: patients.length > 0 
          ? `**🚨 Critical Patients (${patients.length} found):**\n\n${formatPatientData(patients)}`
          : "✅ No patients in critical condition at this time."
      };
    }
    
    // Patient record queries
    if (/patient\s+record|patient\s+information|show.*patient.*(?:record|info|details)/i.test(query)) {
      const patientInfo = extractPatientInfo(query);
      
      if (patientInfo) {
        try {
          if (patientInfo.type === 'name') {
            const patients = await searchPatientsByName(patientInfo.value);
            if (patients.length === 0) {
              return {
                message: `❌ No patients found with name "${patientInfo.value}". Please check the spelling or try a patient ID.`
              };
            } else if (patients.length === 1) {
              const patientRecord = await fetchPatientRecord(patients[0].id);
              return {
                message: formatPatientRecord(patientRecord)
              };
            } else {
              return {
                message: `**🔍 Multiple patients found with name "${patientInfo.value}":**\n\n${formatPatientData(patients)}\n\nPlease be more specific or use a patient ID.`
              };
            }
          } else {
            const patientRecord = await fetchPatientRecord(patientInfo.value);
            return {
              message: formatPatientRecord(patientRecord)
            };
          }
        } catch (error) {
          return {
            message: `❌ Error fetching patient "${patientInfo.value}": ${error instanceof Error ? error.message : 'Please check the patient ID or name.'}`
          };
        }
      }
      
      return {
        message: "Please specify a patient. Examples:\n• 'Show patient record for John Smith'\n• 'Show patient record for patient_1'"
      };
    }
    
    // Patient vitals queries
    if (/patient.*vital|vital.*patient|show.*vital.*patient/i.test(query)) {
      const patientInfo = extractPatientInfo(query);
      
      if (patientInfo) {
        try {
          if (patientInfo.type === 'name') {
            const patients = await searchPatientsByName(patientInfo.value);
            if (patients.length === 0) {
              return {
                message: `❌ No patients found with name "${patientInfo.value}".`
              };
            } else if (patients.length === 1) {
              const vitals = await fetchPatientVitals(patients[0].id);
              return {
                message: `**${patients[0].name} (${patients[0].id})** \n\n${formatVitalSigns(vitals)}`
              };
            } else {
              return {
                message: `**🔍 Multiple patients found:**\n\n${formatPatientData(patients)}\n\nPlease be more specific.`
              };
            }
          } else {
            const vitals = await fetchPatientVitals(patientInfo.value);
            return {
              message: `**Patient ${patientInfo.value}**\n\n${formatVitalSigns(vitals)}`
            };
          }
        } catch (error) {
          return {
            message: `❌ Unable to fetch vitals: ${error instanceof Error ? error.message : 'Please check the patient identifier.'}`
          };
        }
      }
      
      return {
        message: "Please specify a patient. Examples:\n• 'Show vitals for John Smith'\n• 'Show vitals for patient_1'"
      };
    }
    
    // Monitor vitals in room queries
    if (/monitor.*vital|vital.*room|room.*vital|show.*monitor/i.test(query)) {
      const roomNumber = extractRoomNumber(query);
      if (roomNumber) {
        const vitals = await fetchMonitorVitals(roomNumber);
        return {
          message: vitals 
            ? `**🏥 Room ${roomNumber} Monitor**\n\n${formatVitalSigns(vitals)}`
            : `❌ No active monitor found in Room ${roomNumber}.`
        };
      }
      return {
        message: "Please specify a room number. Example: 'Show monitor vitals for room 101'"
      };
    }
    
    // Environmental data queries
    if (/environmental|air\s+quality|temperature.*room|humidity|show.*environment/i.test(query)) {
      const roomNumber = extractRoomNumber(query);
      if (roomNumber) {
        try {
          const envData = await fetchEnvironmentalData(roomNumber);
          console.log('Environmental data received in query service:', envData);
          return {
            message: envData 
              ? `**🏥 Room ${roomNumber} Environment**\n\n${formatEnvironmentalData(envData)}`
              : `❌ No environmental sensor found in Room ${roomNumber}.`
          };
        } catch (error) {
          console.error('Error fetching environmental data:', error);
          return {
            message: `❌ Unable to fetch environmental data for Room ${roomNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      }
      return {
        message: "Please specify a room number. Example: 'Show environmental data for room 101'"
      };
    }
    
    // Health risk queries
    if (/health.*risk|risk.*prediction|risk.*assessment|show.*risk/i.test(query)) {
      const patientInfo = extractPatientInfo(query);
      
      if (patientInfo) {
        try {
          if (patientInfo.type === 'name') {
            const patients = await searchPatientsByName(patientInfo.value);
            if (patients.length === 0) {
              return {
                message: `❌ No patients found with name "${patientInfo.value}".`
              };
            } else if (patients.length === 1) {
              const riskPrediction = await fetchHealthRiskPrediction(patients[0].id);
              return {
                message: `**${patients[0].name} (${patients[0].id})**\n\n${formatHealthRiskPrediction(riskPrediction)}`,
                data: riskPrediction
              };
            } else {
              return {
                message: `**🔍 Multiple patients found:**\n\n${formatPatientData(patients)}`
              };
            }
          } else {
            const riskPrediction = await fetchHealthRiskPrediction(patientInfo.value);
            return {
              message: `**Patient ${patientInfo.value}**\n\n${formatHealthRiskPrediction(riskPrediction)}`,
              data: riskPrediction
            };
          }
        } catch (error) {
          return {
            message: `❌ Unable to fetch risk assessment: ${error instanceof Error ? error.message : 'Data may not be available.'}`
          };
        }
      }
      
      return {
        message: "Please specify a patient. Examples:\n• 'Show health risk for John Smith'\n• 'Show health risk for patient_1'"
      };
    }
    
    // Room occupancy queries
    if (/room.*occup|occup.*room|show.*room.*status/i.test(query)) {
      const roomNumber = extractRoomNumber(query);
      if (roomNumber) {
        const occupancy = await fetchRoomOccupancy(roomNumber);
        return {
          message: `**🏥 Room ${roomNumber} Status:**\n\n${formatRoomOccupancy(occupancy)}`
        };
      } else if (/occupied/i.test(query)) {
        const allOccupancy = await fetchRoomOccupancy();
        const occupiedRooms = allOccupancy.filter(room => room.isOccupied);
        return {
          message: `**🔴 Occupied Rooms (${occupiedRooms.length} total):**\n\n${formatRoomOccupancy(occupiedRooms)}`
        };
      } else if (/available/i.test(query)) {
        const allOccupancy = await fetchRoomOccupancy();
        const availableRooms = allOccupancy.filter(room => !room.isOccupied);
        return {
          message: `**🟢 Available Rooms (${availableRooms.length} total):**\n\n${formatRoomOccupancy(availableRooms)}`
        };
      }
    }
    
    // Room alerts queries
    if (/room.*alert|alert.*room/i.test(query)) {
      const roomNumber = extractRoomNumber(query);
      if (roomNumber) {
        const alerts = await fetchRoomAlerts(roomNumber);
        return {
          message: alerts.length > 0 
            ? `**🚨 Room ${roomNumber} Alerts (${alerts.length} found):**\n\n${formatAlerts(alerts)}`
            : `✅ No alerts found for Room ${roomNumber}.`
        };
      }
      return {
        message: "Please specify a room number. Example: 'Show alerts for room 101'"
      };
    }
    
    // General alert queries
    if (/high.*alert|critical.*alert|urgent.*alert/i.test(query)) {
      const alerts = await fetchAlerts('high');
      return {
        message: `**🚨 High Priority Alerts (${alerts.length} found):**\n\n${formatAlerts(alerts)}`
      };
    }
    
    if (/all.*alert|show.*alert/i.test(query)) {
      const alerts = await fetchAlerts('all');
      return {
        message: `**📢 All Current Alerts (${alerts.length} found):**\n\n${formatAlerts(alerts)}`
      };
    }
    
    // Help/unknown query
    return {
      message: `👋 **Smart Hospital Assistant Help**

I can help you with:

**👤 Patient Information:**
• "Show critical patients" - List patients in critical condition
• "Show patient record for John Smith" - Get patient details  
• "Show vitals for patient_1" - Get vital signs
• "Show health risk for patient_1" - Get risk assessment

**🏥 Room Information:**
• "Show occupied rooms" / "Show available rooms" - Room status
• "Show monitor vitals for room 101" - Monitor data
• "Show environmental data for room 101" - Room conditions
• "Show alerts for room 101" - Room-specific alerts

**🚨 Alerts:**
• "Show high alerts" - High priority alerts
• "Show all alerts" - All current alerts

💡 **Tip:** You can use patient names or IDs. Try asking something specific!`
    };
    
  } catch (error) {
    console.error("Error processing query:", error);
    
    let errorMessage = "❌ Sorry, I encountered an error while processing your request.";
    
    if (error instanceof Error) {
      if (error.message.includes('timed out')) {
        errorMessage = "⏱️ Request timed out. The server may be temporarily unavailable.";
      } else if (error.message.includes('not found')) {
        errorMessage = "🔍 The requested patient or room was not found.";
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = "🌐 Unable to connect to the hospital database. Please check your connection.";
      }
    }
    
    return {
      message: errorMessage + "\n\n💡 Try rephrasing your question or ask for help to see available commands."
    };
  }
};

// Helper function to extract specific parameters from natural language queries
export const extractQueryParameters = (query: string): Record<string, string> => {
  const params: Record<string, string> = {};
  
  // Extract room numbers (e.g., "room 101", "room #203")
  const roomMatch = query.match(/room\s+(?:#)?(\d+)/i);
  if (roomMatch) {
    params.roomNumber = roomMatch[1];
  }
  
  // Extract patient names (simplified approach)
  const nameMatch = query.match(/patient\s+named\s+([A-Za-z\s]+)(?=[\s,.]|$)/i);
  if (nameMatch) {
    params.patientName = nameMatch[1].trim();
  }
  
  // Extract dates (e.g., "on July 28", "yesterday")
  const dateMatch = query.match(/(today|yesterday|tomorrow|on\s+[A-Za-z]+\s+\d+)/i);
  if (dateMatch) {
    params.date = dateMatch[1];
  }
  
  return params;
};