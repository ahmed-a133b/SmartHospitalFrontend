# Real-Time Alerts System

This implementation provides real-time alert updates without using WebSockets. Instead, it uses polling to fetch the latest alert data at regular intervals.

## Features

✅ **Real-time updates**: Automatically polls for new alerts every 3-5 seconds
✅ **New alert notifications**: Shows pop-up notifications for new critical/warning alerts
✅ **Manual refresh**: Button to manually refresh alerts
✅ **Polling controls**: Start/stop real-time updates
✅ **Status indicator**: Shows if real-time updates are active
✅ **Last updated timestamp**: Shows when data was last refreshed
✅ **Alert filtering**: Filter by all, active, resolved, or critical alerts
✅ **Optimized performance**: Only shows notifications for new alerts, not existing ones

## How It Works

1. **Polling**: The `useRealTimeAlerts` hook fetches alert data from `/iotData` endpoint every 3 seconds
2. **Change Detection**: Compares new alerts with previous alerts to detect new ones and resolved ones
3. **Notifications**: Shows popup notifications for new critical and warning alerts
4. **Auto-refresh**: Automatically updates the UI when new data arrives
5. **Manual Control**: Users can start/stop polling and manually refresh

## Components

### 1. `useRealTimeAlerts` Hook
Located: `src/hooks/useRealTimeAlerts.ts`

**Features:**
- Automatic polling with configurable interval
- Change detection for new/resolved alerts
- Callback functions for new alerts and resolved alerts
- Manual refresh functionality
- Start/stop polling controls

**Usage:**
```typescript
const {
  alerts,              // Array of all alerts
  loading,             // Loading state
  error,               // Error state
  refreshAlerts,       // Manual refresh function
  lastUpdated,         // Last update timestamp
  isPolling,           // Whether polling is active
  startPolling,        // Start polling function
  stopPolling          // Stop polling function
} = useRealTimeAlerts({
  pollInterval: 3000,  // Poll every 3 seconds
  enabled: true,       // Start polling immediately
  onNewAlert: (alert) => {
    // Handle new alert
    console.log('New alert:', alert);
  },
  onAlertResolved: (alert) => {
    // Handle resolved alert
    console.log('Alert resolved:', alert);
  }
});
```

### 2. `AlertNotification` Component
Located: `src/components/ui/AlertNotification.tsx`

**Features:**
- Shows popup notifications for new alerts
- Auto-closes after specified duration
- Different styles for different alert types
- Manual close button

### 3. Updated `AlertsManagement` Component
Located: `src/components/dashboard/components/admin/AlertsManagement.tsx`

**New Features:**
- Real-time status indicator
- Manual refresh button
- Polling control button
- Popup notifications for new alerts
- Last updated timestamp

## Configuration

### Polling Interval
You can adjust the polling frequency by changing the `pollInterval` parameter:

```typescript
const { ... } = useRealTimeAlerts({
  pollInterval: 5000, // Poll every 5 seconds
  // ... other options
});
```

### Notification Settings
Customize which alerts trigger notifications:

```typescript
const { ... } = useRealTimeAlerts({
  onNewAlert: (alert) => {
    // Only show notifications for critical alerts
    if (alert.type === 'critical') {
      // Show notification
    }
  }
});
```

## Testing

Use the `AlertsTestPage` component to test the real-time functionality:

1. Navigate to the test page
2. Watch the status indicator to see if polling is active
3. Check the browser console for logs when new alerts arrive
4. Use the Start/Stop button to control polling
5. Use the manual refresh button to fetch latest data

## Performance Considerations

1. **Polling Interval**: 3-5 seconds is optimal. Too frequent can overload the server
2. **Background Polling**: Polling stops automatically when the component unmounts
3. **Error Handling**: Robust error handling prevents crashes from network issues
4. **Memory Management**: Notifications are automatically cleaned up

## Browser Support

- **Modern Browsers**: Full support for all features
- **Older Browsers**: May need polyfills for some ES6+ features
- **Notifications**: Requires user permission for browser notifications

## API Requirements

The system expects the backend to provide:

1. **GET `/iotData`**: Returns all IoT device data including alerts
2. **POST `/iotData/{deviceId}/alerts/{alertId}/resolve`**: Resolves an alert
3. **POST `/iotData/{deviceId}/alerts/{alertId}/assign`**: Assigns an alert

## Migration from Old System

If you were previously using the hospital data context for alerts:

### Before:
```typescript
const { iotDevices, refreshData } = useHospitalData();
// Manual refresh only
```

### After:
```typescript
const { alerts, refreshAlerts } = useRealTimeAlerts();
// Automatic real-time updates + manual refresh
```

## Troubleshooting

### No Real-time Updates
1. Check if polling is active (green dot in status indicator)
2. Check browser console for error messages
3. Verify the API endpoint is accessible
4. Check network connectivity

### High Server Load
1. Increase polling interval (e.g., from 3s to 10s)
2. Implement server-side caching
3. Consider pagination for large datasets

### Memory Issues
1. Ensure components are properly unmounted
2. Check for memory leaks in browser dev tools
3. Limit the number of stored notifications

## Future Enhancements

Possible improvements for the future:

1. **Server-Sent Events (SSE)**: For true real-time updates
2. **WebSocket Support**: For bidirectional real-time communication
3. **Background Sync**: Continue updates when tab is not active
4. **Push Notifications**: Mobile-style push notifications
5. **Advanced Filtering**: More sophisticated alert filtering options
