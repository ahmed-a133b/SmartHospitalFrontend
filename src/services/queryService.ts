import { fetchPatientsByStatus, fetchRoomStatus, fetchAlerts } from './apiService';

interface QueryResponse {
  message: string;
  data?: any;
}

export const processChatQuery = async (query: string): Promise<QueryResponse> => {
  // Convert query to lowercase for easier matching
  const lowerQuery = query.toLowerCase();
  
  try {
    // Patient status queries
    if (lowerQuery.includes('critical patient') || 
        lowerQuery.includes('critical state') ||
        (lowerQuery.includes('patient') && lowerQuery.includes('critical'))) {
      const patients = await fetchPatientsByStatus('critical');
      return {
        message: `I found ${patients.length} patients in critical condition:`,
        data: patients
      };
    }
    
    // Room occupancy queries
    else if (lowerQuery.includes('room') && 
             (lowerQuery.includes('occupied') || lowerQuery.includes('occupancy'))) {
      const rooms = await fetchRoomStatus('occupied');
      return {
        message: `Here are the currently occupied rooms:`,
        data: rooms
      };
    }
    
    else if (lowerQuery.includes('room') && lowerQuery.includes('available')) {
      const rooms = await fetchRoomStatus('available');
      return {
        message: `Here are the currently available rooms:`,
        data: rooms
      };
    }
    
    // Room alerts queries
    else if (lowerQuery.includes('high alert') || 
             (lowerQuery.includes('room') && lowerQuery.includes('alert'))) {
      const alerts = await fetchAlerts('high');
      return {
        message: `I found ${alerts.length} rooms with high priority alerts:`,
        data: alerts
      };
    }
    
    else if (lowerQuery.includes('all alert') || lowerQuery.includes('all room alert')) {
      const alerts = await fetchAlerts('all');
      return {
        message: `Here are all current room alerts:`,
        data: alerts
      };
    }
    
    // Unknown query
    else {
      return {
        message: "I'm not sure how to answer that. You can ask me about critical patients, room occupancy, or room alerts."
      };
    }
  } catch (error) {
    console.error("Error processing query:", error);
    return {
      message: "Sorry, I encountered an error while processing your query. Please try again."
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