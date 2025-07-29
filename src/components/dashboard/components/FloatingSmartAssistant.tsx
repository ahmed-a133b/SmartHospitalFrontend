import React, { useState } from 'react';
import { MessageCircle, X, Minimize2, Maximize2 } from 'lucide-react';
import SmartQueryChat from './SmartQuery/SmartQueryChat';

const FloatingSmartAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleAssistant = () => {
    if (isOpen) {
      setIsOpen(false);
      setIsMinimized(false);
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  };

  const minimizeAssistant = () => {
    setIsMinimized(true);
  };

  const restoreAssistant = () => {
    setIsMinimized(false);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={toggleAssistant}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-300 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 z-50"
          title="Open Smart Assistant"
        >
          <MessageCircle className="h-6 w-6 mx-auto" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ease-in-out ${
          isMinimized ? 'w-80 h-16' : 'w-96 h-[600px] max-h-[80vh]'
        } max-w-[calc(100vw-2rem)] md:max-w-96`}>
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden h-full flex flex-col">
            {/* Header */}
            <div className="bg-blue-600 text-white p-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5" />
                <h3 className="font-semibold text-sm">Smart Assistant</h3>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={isMinimized ? restoreAssistant : minimizeAssistant}
                  className="p-1 hover:bg-blue-700 rounded transition-colors"
                  title={isMinimized ? 'Restore' : 'Minimize'}
                >{isMinimized?  (<Maximize2 className="h-4 w-4" />
                  ) : (
                    <Minimize2 className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={toggleAssistant}
                  className="p-1 hover:bg-blue-700 rounded transition-colors"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            {!isMinimized && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <SmartQueryChat />
              </div>
            )}

            {/* Minimized State */}
            {isMinimized && (
              <div 
                className="flex-1 flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={restoreAssistant}
              >
                {/* <span className="text-gray-600 text-sm">Click to expand chat</span> */}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop for mobile */}
      {isOpen && !isMinimized && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 z-40 lg:hidden"
          onClick={toggleAssistant}
        />
      )}
    </>
  );
};

export default FloatingSmartAssistant;
