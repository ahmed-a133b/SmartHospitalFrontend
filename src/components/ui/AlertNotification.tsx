import React from 'react';
import { AlertTriangle, Clock, CheckCircle, X } from 'lucide-react';

interface AlertNotificationProps {
  alert: {
    id: string;
    deviceId: string;
    roomId: string;
    type: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: string;
  };
  onClose: () => void;
  autoClose?: boolean;
  duration?: number; // in milliseconds
}

export const AlertNotification: React.FC<AlertNotificationProps> = ({
  alert,
  onClose,
  autoClose = true,
  duration = 5000
}) => {
  React.useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  const getAlertStyle = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className={`max-w-sm w-full shadow-lg rounded-lg pointer-events-auto border-l-4 ${getAlertStyle(alert.type)}`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getAlertIcon(alert.type)}
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium">
              New {alert.type} alert
            </p>
            <p className="mt-1 text-sm">
              {alert.message}
            </p>
            <div className="mt-2 text-xs opacity-75">
              <p>Device: {alert.deviceId.replace(/^m/, 'M').replace('_', ' ')}</p>
              <p>Room: {alert.roomId.split('_')[1]}</p>
              <p>Time: {alert.timestamp}</p>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className="rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AlertNotificationContainerProps {
  children: React.ReactNode;
}

export const AlertNotificationContainer: React.FC<AlertNotificationContainerProps> = ({ children }) => {
  return (
    <div
      aria-live="assertive"
      className="fixed inset-0 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end z-50"
    >
      <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
        {children}
      </div>
    </div>
  );
};
